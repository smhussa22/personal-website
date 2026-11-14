import type { Market } from '../_lib/types'
import { CARD, LABEL, ago, int } from '../_lib/format'

export function StatsRow({ market, now }: { market: Market | null; now: number }) {
  const s = market?.stats
  const tiles = [
    { label: 'Trades per minute', value: int(s?.trades_per_min), hint: `last trade ${ago(now, s?.last_trade_ms)}` },
    { label: 'Trades this session', value: int(s?.trades_total), hint: 'since the exchange opened' },
    { label: 'Shares traded', value: int(s?.volume_total), hint: 'across all five stocks' },
    { label: 'Shares waiting', value: int(s?.resting), hint: 'resting in order books' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className={CARD}>
          <p className={LABEL}>{t.label}</p>
          <p className="mt-1 text-xl font-medium tabular-nums">{t.value}</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{t.hint}</p>
        </div>
      ))}
    </div>
  )
}
