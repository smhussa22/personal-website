import type { Book, Level } from '../_lib/types'
import { BUY_TEXT, SELL_TEXT, int, money } from '../_lib/format'

const ROWS = 8

function Side({
  title,
  hint,
  levels,
  peak,
  tone,
  mine,
  onPick,
}: {
  title: string
  hint: string
  levels: Level[]
  peak: number
  tone: 'buy' | 'sell'
  mine: Set<number>
  onPick: (price: number) => void
}) {
  const text = tone === 'buy' ? BUY_TEXT : SELL_TEXT
  const bar = tone === 'buy' ? 'bg-emerald-500/10 right-0' : 'bg-red-500/10 left-0'
  return (
    <div>
      <p className={`text-xs font-medium ${text}`}>{title}</p>
      <p className="mb-2 text-[11px] text-zinc-400">{hint}</p>
      {levels.length === 0 ? (
        <p className="text-xs text-zinc-400">—</p>
      ) : (
        levels.slice(0, ROWS).map((l) => (
          <button
            key={l.price}
            onClick={() => onPick(l.price)}
            title="Use this price in the order form"
            className={`relative flex w-full justify-between overflow-hidden rounded px-2 py-0.5 text-sm tabular-nums transition-colors hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 ${
              mine.has(l.price) ? 'ring-2 ring-inset ring-sky-400' : ''
            }`}
          >
            <span className={`absolute inset-y-0 ${bar}`} style={{ width: `${(l.volume / peak) * 100}%` }} />
            <span className={`relative ${text}`}>
              {money(l.price)}
              {mine.has(l.price) && <span className="ml-2 rounded bg-sky-500 px-1.5 text-[10px] font-medium text-white">your order</span>}
            </span>
            <span className="relative text-zinc-500 dark:text-zinc-400">{int(l.volume)}</span>
          </button>
        ))
      )}
    </div>
  )
}

export function Ladder({ book, mine, onPick }: { book: Book | null; mine: Set<number>; onPick: (price: number) => void }) {
  const bids = book?.bids ?? []
  const asks = book?.asks ?? []
  const peak = Math.max(1, ...bids.slice(0, ROWS).map((l) => l.volume), ...asks.slice(0, ROWS).map((l) => l.volume))
  return (
    <div className="grid grid-cols-2 gap-4">
      <Side title="Buyers" hint="price · shares wanted" levels={bids} peak={peak} tone="buy" mine={mine} onPick={onPick} />
      <Side title="Sellers" hint="price · shares offered" levels={asks} peak={peak} tone="sell" mine={mine} onPick={onPick} />
    </div>
  )
}
