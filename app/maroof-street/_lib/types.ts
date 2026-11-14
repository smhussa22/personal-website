export const SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'] as const
export type SymbolName = (typeof SYMBOLS)[number]

export type SymbolStats = {
  symbol: SymbolName
  best_bid: number
  best_ask: number
  resting: number
  last: number | null
  change: number
  change_pct: number
  high: number | null
  low: number | null
  volume: number
  trades: number
  spark: number[]
}

export type Market = {
  server_ms: number
  symbols: SymbolStats[]
  stats: {
    trades_total: number
    volume_total: number
    trades_per_min: number
    last_trade_ms: number | null
    resting: number
  }
}

export type Level = { price: number; volume: number }
export type Book = { symbol: SymbolName; bids: Level[]; asks: Level[] }

export type Trade = {
  symbol: SymbolName
  price: number
  qty: number
  side: 'buy' | 'sell'
  ts_ms?: number
  taker: string | null
  maker: string | null
  taker_id?: number
  maker_id?: number
}

export type Account = { cash: number; reserved: number; positions: Record<string, number> }
export type TraderStat = { name: string; trades: number; volume: number; last_ts_ms: number | null }
export type Status = { open: boolean; nextOpen?: string | null }

export type OrderAck = {
  accepted?: boolean
  reason?: string
  order_id?: number
  retry_after?: number
  lo?: number
  hi?: number
}

export type OrderState = {
  known: boolean
  qty: number | null
  price: number | null
  filled: number
  fills: { price: number; qty: number; ts_ms?: number; counterparty: string | null }[]
}

export type MyOrder = {
  id: number
  symbol: SymbolName
  side: 'buy' | 'sell'
  type: 'gtc' | 'fak'
  price: number
  qty: number
  sentAt: number // server-clock ms
}

export type MarketState = 'connecting' | 'open' | 'closed'
