import type { OrderAck } from './types'

export const CARD =
  'rounded-xl bg-zinc-50/40 p-4 ring-1 ring-inset ring-zinc-200/50 dark:bg-zinc-950/40 dark:ring-zinc-800/50'
export const LABEL = 'text-xs font-medium uppercase tracking-wide text-zinc-400'
export const BUY_TEXT = 'text-emerald-600 dark:text-emerald-400'
export const SELL_TEXT = 'text-red-500 dark:text-red-400'

export const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${n.toLocaleString('en-US')}`
export const int = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US'))

export function ago(now: number, ts: number | null | undefined): string {
  if (!ts) return '—'
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 3) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}

export function friendlyReason(ack: OrderAck, symbol: string): string {
  switch (ack.reason) {
    case 'rate_limited':
      return `One order every 3 seconds. Try again in ${ack.retry_after ?? 3}s.`
    case 'hourly_limit':
      return 'Demo limit reached (30 orders per hour). Come back a little later.'
    case 'price_out_of_band':
      return `Price must be within 15% of the market (${money(ack.lo)} to ${money((ack.hi ?? 1) - 1)}).`
    case 'invalid_order':
      return 'Check the price (whole dollars) and quantity (1 to 100).'
    case 'gateway_unavailable':
      return 'The exchange is not reachable right now.'
  }
  const reason = (ack.reason ?? '').toLowerCase()
  if (reason.includes('insufficient cash'))
    return 'The shared demo account is out of cash. Everyone shares it, so try selling instead.'
  if (reason.includes('insufficient shares'))
    return `The shared demo account has no ${symbol} left to sell. Try buying first.`
  if (reason.includes('rate limit'))
    return 'The exchange is rate limiting this account. Try again in a moment.'
  return ack.reason || 'Order rejected.'
}

// Same trader colours everywhere (chips, cards) so a bot is recognisable at a glance.
export const TRADER_STYLE: Record<string, { dot: string; chip: string }> = {
  'Market Maker': { dot: 'bg-sky-500', chip: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  'Random Trader': { dot: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  'Go Momentum': { dot: 'bg-cyan-500', chip: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' },
  'Rust Mean-Reversion': {
    dot: 'bg-orange-500',
    chip: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  },
  'Java TWAP': { dot: 'bg-violet-500', chip: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  Visitor: { dot: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
}
export const traderStyle = (name: string | null) =>
  (name && TRADER_STYLE[name]) || {
    dot: 'bg-zinc-400',
    chip: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
  }
