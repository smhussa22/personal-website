import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BUY_TEXT, CARD, LABEL, SELL_TEXT, ago, money, traderStyle } from '../_lib/format'
import type { SymbolName, Trade } from '../_lib/types'
import { scrollBox } from './scroll'

type Filter = 'all' | 'symbol' | 'mine'

function Chip({ name }: { name: string | null }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${traderStyle(name).chip}`}>
      {name ?? 'Someone'}
    </span>
  )
}

export function Feed({
  tape,
  mineTrades,
  symbol,
  myIds,
  now,
}: {
  tape: Trade[] | null
  mineTrades: Trade[]
  symbol: SymbolName
  myIds: Set<number>
  now: number
}) {
  const [filter, setFilter] = useState<Filter>('all')
  // "hover to pause" freezes the unfiltered list; the filter is applied on top, so changing it always works
  const [frozen, setFrozen] = useState<Trade[] | null>(null)

  const isMine = (t: Trade) => myIds.has(t.taker_id ?? -1) || myIds.has(t.maker_id ?? -1) || t.taker === 'You'
  // your fills show up straight away; once the exchange's own tape carries them they are not added twice
  const onTape = new Set((tape ?? []).map((t) => `${t.taker_id}-${t.ts_ms}-${t.qty}-${t.price}`))
  const extra = mineTrades.filter((t) => !onTape.has(`${t.taker_id}-${t.ts_ms}-${t.qty}-${t.price}`))
  const merged = [...extra, ...(tape ?? [])].sort((a, b) => (b.ts_ms ?? 0) - (a.ts_ms ?? 0))
  const matches = (t: Trade) => filter === 'all' || (filter === 'symbol' ? t.symbol === symbol : isMine(t))
  const seen = new Map<string, number>()
  // a key built from the trade itself, so a new row at the top does not make every row below it animate again
  const rowKey = (t: Trade) => {
    const base = `${t.symbol}-${t.ts_ms}-${t.taker_id ?? 'x'}-${t.maker_id ?? 'x'}-${t.qty}-${t.price}`
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  }
  const rows = (frozen ?? merged).filter(matches)
  const count = (f: Filter) => merged.filter((t) => f === 'all' || (f === 'symbol' ? t.symbol === symbol : isMine(t))).length

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Everything' },
    { value: 'symbol', label: symbol },
    { value: 'mine', label: 'My trades' },
  ]

  return (
    <div className={CARD}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className={LABEL}>Live activity</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Every trade as it happens. Hover to pause.
          </p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Filter trades">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setFilter(f.value)
                setFrozen(null)
              }}
              aria-pressed={filter === f.value}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                filter === f.value
                  ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {f.label} <span className="opacity-60">{count(f.value)}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        className={`${scrollBox} relative max-h-80 pr-1`}
        onMouseEnter={() => setFrozen(merged)}
        onMouseLeave={() => setFrozen(null)}
      >
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">
            {filter === 'mine'
              ? 'Place an order and your trades show up here.'
              : filter === 'symbol'
                ? `No recent ${symbol} trades yet.`
                : 'Waiting for the first trade…'}
          </p>
        ) : (
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {rows.filter((t, i) => i < 30 || isMine(t)).map((t) => (
                <motion.li
                  key={rowKey(t)}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg px-2 py-1.5 text-sm ${
                    isMine(t) ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  <Chip name={t.taker} />
                  <span className={t.side === 'buy' ? BUY_TEXT : SELL_TEXT}>
                    {t.side === 'buy' ? 'bought' : 'sold'}
                  </span>
                  <span className="tabular-nums">
                    {t.qty} {t.symbol}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">at</span>
                  <span className="tabular-nums">{money(t.price)}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">{t.side === 'buy' ? 'from' : 'to'}</span>
                  <Chip name={t.maker} />
                  <span className="ml-auto text-xs text-zinc-400">{ago(now, t.ts_ms)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  )
}
