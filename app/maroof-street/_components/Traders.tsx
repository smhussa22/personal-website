import { CARD, LABEL, ago, int, traderStyle } from '../_lib/format'
import type { TraderStat } from '../_lib/types'

const INFO: Record<string, { lang: string; what: string }> = {
  'Market Maker': {
    lang: 'Python',
    what: 'Posts a buy price and a sell price around the middle of the market every 5 seconds, so there is always someone to trade with.',
  },
  'Random Trader': {
    lang: 'Python',
    what: 'Fires an aggressive order at a random stock every few seconds. This is what creates most of the trades.',
  },
  'Go Momentum': {
    lang: 'Go',
    what: 'Follows the crowd. If 4 of the last 5 trades were buys it buys, if 4 were sells it sells.',
  },
  'Rust Mean-Reversion': {
    lang: 'Rust',
    what: 'Bets against the crowd. Sells when the price runs above its recent average, buys when it drops below.',
  },
  'Java TWAP': {
    lang: 'Java',
    what: 'Slices a big order into 10 pieces, 10 seconds apart, the way an institution hides its size.',
  },
  Visitor: {
    lang: 'You',
    what: 'Anyone on this page. Each visitor has their own wallet, and all orders trade against the same market.',
  },
}

const ORDER = Object.keys(INFO)
const ACTIVE_MS = 15_000

export function Traders({
  traders,
  now,
  closed,
}: {
  traders: TraderStat[] | null
  now: number
  closed: boolean
}) {
  return (
    <div>
      <p className={LABEL}>Who is trading</p>
      <p className="mb-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Six traders, written in four languages, all talking to the same exchange over the same gRPC API.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ORDER.map((name) => {
          const info = INFO[name]
          const stat = traders?.find((t) => t.name === name)
          const active = !closed && !!stat?.last_ts_ms && now - stat.last_ts_ms < ACTIVE_MS
          return (
            <div key={name} className={`${CARD} flex flex-col gap-2`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    {active && (
                      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${traderStyle(name).dot}`} />
                    )}
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${traderStyle(name).dot}`} />
                  </span>
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {info.lang}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{info.what}</p>
              <p className="mt-auto text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                {closed || !stat
                  ? 'Waiting for the market to open'
                  : `${int(stat.trades)} trades · ${int(stat.volume)} shares · ${
                      stat.last_ts_ms ? ago(now, stat.last_ts_ms) : 'not traded yet'
                    }`}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
