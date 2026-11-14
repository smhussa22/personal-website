import { useFlash } from '../_lib/hooks'
import { BUY_TEXT, SELL_TEXT, money } from '../_lib/format'
import { SYMBOLS, type SymbolName, type SymbolStats } from '../_lib/types'

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  const w = 100
  const h = 28
  if (points.length < 2) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full text-zinc-300 dark:text-zinc-700" aria-hidden>
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="currentColor" strokeDasharray="3 3" />
      </svg>
    )
  }
  const lo = Math.min(...points)
  const span = Math.max(Math.max(...points) - lo, 1)
  const d = points
    .map((p, i) => `${(i / (points.length - 1)) * w},${h - 2 - ((p - lo) / span) * (h - 4)}`)
    .join(' ')
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={`h-7 w-full ${up ? BUY_TEXT : SELL_TEXT}`}
      aria-hidden
    >
      <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function Card({ s, selected, onSelect }: { s: SymbolStats; selected: boolean; onSelect: () => void }) {
  const flash = useFlash(s.last)
  const up = s.change >= 0
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-xl p-3 text-left ring-1 ring-inset transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
        selected
          ? 'bg-zinc-100 ring-zinc-400/60 dark:bg-zinc-900 dark:ring-zinc-500/60'
          : 'bg-zinc-50/40 ring-zinc-200/50 hover:bg-zinc-100/60 dark:bg-zinc-950/40 dark:ring-zinc-800/50 dark:hover:bg-zinc-900/60'
      }`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{s.symbol}</span>
        <span className={`text-xs tabular-nums ${s.trades ? (up ? BUY_TEXT : SELL_TEXT) : 'text-zinc-400'}`}>
          {s.trades ? `${up ? '▲' : '▼'} ${Math.abs(s.change_pct).toFixed(2)}%` : '—'}
        </span>
      </div>
      <p
        className={`-mx-1 mt-1 w-fit rounded px-1 text-lg font-medium tabular-nums transition-colors duration-700 ${
          flash === 'up' ? 'bg-emerald-500/20' : flash === 'down' ? 'bg-red-500/20' : 'bg-transparent'
        }`}
      >
        {money(s.last)}
      </p>
      <Sparkline points={s.spark} up={up} />
    </button>
  )
}

export function Ticker({
  symbols,
  selected,
  onSelect,
}: {
  symbols: SymbolStats[]
  selected: SymbolName
  onSelect: (s: SymbolName) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {symbols.length === 0 &&
        SYMBOLS.map((s) => (
          <div key={s} className="h-[92px] animate-pulse rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60" />
        ))}
      {symbols.map((s) => (
        <Card key={s.symbol} s={s} selected={s.symbol === selected} onSelect={() => onSelect(s.symbol)} />
      ))}
    </div>
  )
}
