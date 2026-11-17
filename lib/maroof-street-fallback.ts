// The fallback when no exchange is reachable: a simulated market that runs around the clock (see maroof-street-sim.ts).
// Visitor orders are matched against its book and always complete, and are labelled simulated. Nothing is kept in
// process memory: the market comes from the clock and wallets live in the wallet store, so it behaves the same on
// every serverless instance.
import { applyOrder, readOrder, readWallet, takeCooldown, type SimFill } from './maroof-street-wallet'
import { simFrame } from './maroof-street-sim'

const BAND_PCT = 15
const SIM_MAKER = 'Market Maker'
const HOUSE = 'demo-liquidity'
const SIM_ID_BASE = 700_000
const COOLDOWN_SECS = 3

export function simStatus() {
  return { open: true, mode: 'sim' as const }
}

export async function simGet(p: string, search: string, visitor: string): Promise<unknown | null> {
  const frame = simFrame()
  const sym = (re: RegExp) => p.match(re)?.[1]

  if (p === 'status') return { ...simStatus(), server_ms: Date.now() }
  if (p === 'market') return frame.market
  if (p === 'tape') {
    const limit = Number(new URLSearchParams(search).get('limit') ?? 30)
    return frame.tape.slice(0, limit)
  }
  if (p === 'traders') return frame.traders
  if (p === 'account') return readWallet(visitor)
  const book = sym(/^book\/(\w+)$/)
  if (book) return frame.books[book]
  const trades = sym(/^trades\/(\w+)$/)
  if (trades) return frame.trades[trades] ?? []
  const order = p.match(/^order\/(\w+)\/(\d+)$/)
  if (order) return readOrder(visitor, Number(order[2]))
  return null
}

type OrderBody = { symbol?: string; side?: string; price?: number; quantity?: number; type?: string }

export async function simOrder(body: OrderBody, ip: string, visitor: string) {
  const frame = simFrame()
  const { symbol, side, price, quantity } = body
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

  // match against the simulated book, best price first
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

  // Demo guarantee: whatever the simulated book could not fill is taken by the house at the visitor's limit price,
  // so every visitor order ends fully filled and has a complete trade to show.
  if (left > 0) fills.push({ price: price!, qty: left, ts_ms: now, counterparty: HOUSE, house: true })

  const result = await applyOrder(visitor, { symbol: symbol!, side, price: price!, qty: quantity! }, fills, SIM_ID_BASE)
  if (!result.ok) return { accepted: false, reason: result.reason }
  return { accepted: true, reason: '', order_id: result.id, simulated: true }
}
