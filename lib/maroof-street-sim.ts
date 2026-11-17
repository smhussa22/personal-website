// A simulated market that runs around the clock without any server state. Every value is a pure function of the clock,
// so every serverless instance shows the same market at the same moment, and it needs no recording or database.
//
// Prices are layered value noise (slow drift over days, faster swings over hours, minutes and seconds), so each week
// looks different and the series is continuous. Trades and book depth come from a hash of the time bucket.

export const SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'] as const
const REF: Record<string, number> = { AAPL: 150, TSLA: 250, NVDA: 400, MSFT: 300, GOOGL: 170 }
const TRADERS = ['Market Maker', 'Random Trader', 'Go Momentum', 'Rust Mean-Reversion', 'Java TWAP']
const BUCKET_MS = 2000

type Level = { price: number; volume: number }
type Trade = {
  symbol: string; price: number; qty: number; side: 'buy' | 'sell'; ts_ms: number; taker: string; maker: string
}

// deterministic number in [0, 1) from integers
function rand(...parts: number[]): number {
  let h = 2166136261
  for (const p of parts) {
    h ^= p | 0
    h = Math.imul(h, 16777619)
    h ^= h >>> 13
    h = Math.imul(h, 0x5bd1e995)
  }
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

const hashSymbol = (s: string) => [...s].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)

// smooth noise in [-1, 1] that changes over `periodMs`
function noise(seed: number, t: number, periodMs: number): number {
  const x = t / periodMs
  const i = Math.floor(x)
  const f = x - i
  const s = f * f * (3 - 2 * f)
  const a = rand(seed, i) * 2 - 1
  const b = rand(seed, i + 1) * 2 - 1
  return a + (b - a) * s
}

export function priceAt(symbol: string, t: number): number {
  const seed = hashSymbol(symbol)
  const day = 86_400_000
  const move =
    0.07 * noise(seed + 1, t, 4 * day) + // drift from week to week
    0.03 * noise(seed + 2, t, 6 * 3_600_000) +
    0.012 * noise(seed + 3, t, 25 * 60_000) +
    0.004 * noise(seed + 4, t, 70_000) +
    0.0012 * noise(seed + 5, t, 9_000)
  return Math.max(2, Math.round(REF[symbol] * (1 + move)))
}

function tradesIn(symbol: string, bucket: number): Trade[] {
  const seed = hashSymbol(symbol)
  if (rand(seed, bucket, 1) > 0.6) return []
  const taker = Math.floor(rand(seed, bucket, 2) * TRADERS.length)
  let maker = Math.floor(rand(seed, bucket, 3) * TRADERS.length)
  if (maker === taker) maker = (maker + 1) % TRADERS.length
  const ts = bucket * BUCKET_MS + Math.floor(rand(seed, bucket, 4) * BUCKET_MS)
  return [{
    symbol,
    price: priceAt(symbol, ts),
    qty: 1 + Math.floor(rand(seed, bucket, 5) * 20),
    side: rand(seed, bucket, 6) > 0.5 ? 'buy' : 'sell',
    ts_ms: ts,
    taker: TRADERS[taker],
    maker: TRADERS[maker],
  }]
}

function recentTrades(symbol: string, now: number, count: number): Trade[] {
  const out: Trade[] = []
  for (let b = Math.floor(now / BUCKET_MS); out.length < count && b > Math.floor(now / BUCKET_MS) - 400; b--) {
    for (const t of tradesIn(symbol, b)) if (t.ts_ms <= now) out.push(t)
  }
  return out
}

function bookFor(symbol: string, now: number): { symbol: string; bids: Level[]; asks: Level[] } {
  const mid = priceAt(symbol, now)
  const seed = hashSymbol(symbol)
  const slot = Math.floor(now / 3000)
  const spread = 1 + (rand(seed, slot, 9) > 0.7 ? 1 : 0)
  const bestBid = Math.max(2, mid - 1)
  const bestAsk = bestBid + spread
  const volume = (side: number, k: number) => 5 + Math.floor(rand(seed, slot, side * 100 + k) * 40)
  return {
    symbol,
    bids: Array.from({ length: 10 }, (_, k) => ({ price: bestBid - k, volume: volume(-1, k) })),
    asks: Array.from({ length: 10 }, (_, k) => ({ price: bestAsk + k, volume: volume(1, k) })),
  }
}

export function simFrame(now = Date.now()) {
  const books: Record<string, ReturnType<typeof bookFor>> = {}
  const trades: Record<string, Trade[]> = {}
  const symbols = SYMBOLS.map((symbol) => {
    books[symbol] = bookFor(symbol, now)
    trades[symbol] = recentTrades(symbol, now, 20)
    const spark = Array.from({ length: 40 }, (_, k) => priceAt(symbol, now - (39 - k) * 12_000))
    const recent = recentTrades(symbol, now, 40)
    const last = priceAt(symbol, now)
    return {
      symbol,
      best_bid: books[symbol].bids[0].price,
      best_ask: books[symbol].asks[0].price,
      resting: [...books[symbol].bids, ...books[symbol].asks].reduce((n, l) => n + l.volume, 0),
      last,
      change: last - spark[0],
      change_pct: Math.round(((last - spark[0]) / spark[0]) * 10000) / 100,
      high: Math.max(...spark),
      low: Math.min(...spark),
      volume: recent.reduce((n, t) => n + t.qty, 0),
      trades: recent.length,
      spark,
    }
  })

  const tape = SYMBOLS.flatMap((s) => recentTrades(s, now, 100)).sort((a, b) => b.ts_ms - a.ts_ms).slice(0, 100)

  // counters since midnight UTC, estimated from the same trade rate so they only ever grow during the day
  const sinceMidnight = (now % 86_400_000) / BUCKET_MS
  const tradesTotal = Math.floor(sinceMidnight * SYMBOLS.length * 0.6)
  const traders = TRADERS.map((name, i) => ({
    name,
    trades: Math.floor(tradesTotal * (0.28 - i * 0.03)),
    volume: Math.floor(tradesTotal * (0.28 - i * 0.03) * 10.5),
    last_ts_ms: tape.find((t) => t.taker === name || t.maker === name)?.ts_ms ?? null,
  }))

  return {
    t: now,
    market: {
      server_ms: now,
      symbols,
      stats: {
        trades_total: tradesTotal,
        volume_total: Math.floor(tradesTotal * 10.5),
        trades_per_min: tape.filter((t) => t.ts_ms > now - 60_000).length,
        last_trade_ms: tape[0]?.ts_ms ?? null,
        resting: symbols.reduce((n, s) => n + s.resting, 0),
      },
    },
    tape,
    traders,
    books,
    trades,
  }
}
