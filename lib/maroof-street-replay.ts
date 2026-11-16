import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

// Plays back a session recorded from the real exchange (scripts/record_session.py in the maroof-street repo)
// when no exchange is reachable. Visitor orders are matched here against the recorded book and are labelled simulated.
// Nothing is kept in process memory: the playback position comes from the clock and wallets live in the wallet store,
// so it behaves the same across serverless instances.
import { applyOrder, readOrder, readWallet, takeCooldown, type SimFill } from './maroof-street-wallet'

type Level = { price: number; volume: number }
type Frame = {
  t: number
  market: { server_ms: number; symbols: { symbol: string; resting: number; last: number | null }[] } & Record<string, unknown>
  tape: Record<string, unknown>[]
  traders: Record<string, unknown>[]
  books: Record<string, { symbol: string; bids: Level[]; asks: Level[] }>
  trades: Record<string, Record<string, unknown>[]>
}
type Recording = { recorded_at: number; every_ms: number; frames: Frame[] }

const FILE = path.join(process.cwd(), 'data', 'maroof-street', 'session.json.gz')
const BAND_PCT = 15
const SIM_MAKER = 'replay-market-maker'
const HOUSE = 'demo-liquidity'
const SIM_ID_BASE = 700_000
const COOLDOWN_SECS = 3
const SHIFT_KEYS = new Set(['ts_ms', 'last_trade_ms', 'server_ms', 'last_ts_ms'])

let cached: Recording | null | undefined

export function loadRecording(): Recording | null {
  if (cached !== undefined) return cached
  try {
    const rec = JSON.parse(zlib.gunzipSync(fs.readFileSync(FILE)).toString('utf-8')) as Recording
    cached = rec.frames?.length ? rec : null
  } catch {
    cached = null
  }
  return cached
}

// moves every timestamp so the recorded frame looks like it happened just now
function shift<T>(value: T, by: number): T {
  if (Array.isArray(value)) return value.map((v) => shift(v, by)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = SHIFT_KEYS.has(k) && typeof v === 'number' ? v + by : shift(v, by)
    }
    return out as T
  }
  return value
}

function currentFrame(rec: Recording) {
  const index = Math.floor(Date.now() / rec.every_ms) % rec.frames.length
  const frame = rec.frames[index]
  return { frame, by: Date.now() - frame.t }
}

export function replayStatus() {
  const rec = loadRecording()
  return rec ? { open: true, mode: 'replay', recordedAt: new Date(rec.recorded_at).toISOString() } : null
}

export async function replayGet(p: string, search: string, visitor: string): Promise<unknown | null> {
  const rec = loadRecording()
  if (!rec) return null
  const { frame, by } = currentFrame(rec)
  const sym = (re: RegExp) => p.match(re)?.[1]

  if (p === 'status') return { ...replayStatus(), server_ms: Date.now() }
  if (p === 'market') return shift(frame.market, by)
  if (p === 'tape') {
    const limit = Number(new URLSearchParams(search).get('limit') ?? 30)
    return shift(frame.tape.slice(0, limit), by)
  }
  if (p === 'traders') return shift(frame.traders, by)
  if (p === 'account') return readWallet(visitor)
  const book = sym(/^book\/(\w+)$/)
  if (book) return frame.books[book]
  const trades = sym(/^trades\/(\w+)$/)
  if (trades) return shift(frame.trades[trades] ?? [], by)
  const order = p.match(/^order\/(\w+)\/(\d+)$/)
  if (order) return readOrder(visitor, Number(order[2]))
  return null
}

type OrderBody = { symbol?: string; side?: string; price?: number; quantity?: number; type?: string }

export async function replayOrder(body: OrderBody, ip: string, visitor: string) {
  const rec = loadRecording()
  if (!rec) return null
  const { frame } = currentFrame(rec)
  const { symbol, side, price, quantity, type } = body
  const book = symbol ? frame.books[symbol] : undefined
  if (!book || (side !== 'buy' && side !== 'sell') || !Number.isInteger(price) || !Number.isInteger(quantity)) {
    return { accepted: false, reason: 'invalid_order' }
  }
  if (quantity! < 1 || quantity! > 100 || price! < 1) return { accepted: false, reason: 'invalid_order' }

  const bid = book.bids[0]?.price
  const ask = book.asks[0]?.price
  const ref = bid && ask ? Math.floor((bid + ask) / 2) : (bid ?? ask)
  if (ref) {
    const lo = Math.floor((ref * (100 - BAND_PCT)) / 100)
    const hi = Math.floor((ref * (100 + BAND_PCT)) / 100) + 1
    if (price! < lo || price! >= hi) return { accepted: false, reason: 'price_out_of_band', lo, hi }
  }

  const wait = await takeCooldown(`${ip}:${visitor}`, COOLDOWN_SECS)
  if (wait > 0) return { accepted: false, reason: 'rate_limited', retry_after: wait }

  // match against the recorded book, best price first
  const now = Date.now()
  const levels = side === 'buy' ? book.asks : book.bids
  let left = quantity!
  const fills: SimFill[] = []
  for (const level of levels) {
    const crosses = side === 'buy' ? level.price <= price! : level.price >= price!
    if (!crosses || left === 0) break
    const take = Math.min(left, level.volume)
    fills.push({ price: level.price, qty: take, ts_ms: now, counterparty: SIM_MAKER })
    left -= take
  }

  // Demo guarantee: whatever the recorded book could not fill is taken by the house at the visitor's limit price,
  // so every visitor order ends fully filled and has a complete trade to show.
  if (left > 0) fills.push({ price: price!, qty: left, ts_ms: now, counterparty: HOUSE, house: true })

  const result = await applyOrder(visitor, { symbol: symbol!, side, price: price!, qty: quantity! }, fills, SIM_ID_BASE)
  void type
  if (!result.ok) return { accepted: false, reason: result.reason }
  return { accepted: true, reason: '', order_id: result.id, simulated: true }
}
