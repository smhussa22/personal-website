import type { Book, Level } from '../_lib/types'
import { money } from '../_lib/format'

const W = 400
const H = 150
const BASE = H - 16

function cumulative(levels: Level[]) {
  let total = 0
  return levels.map((l) => ({ price: l.price, total: (total += l.volume) }))
}

export function DepthChart({ book }: { book: Book | null }) {
  if (!book || (!book.bids.length && !book.asks.length)) {
    return (
      <div className="flex h-[150px] items-center justify-center rounded-lg bg-zinc-100/60 px-6 text-center text-xs text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
        No resting orders yet. The market maker posts fresh quotes every few seconds.
      </div>
    )
  }

  const prices = [...book.bids, ...book.asks].map((l) => l.price)
  const lo = Math.min(...prices)
  const hi = Math.max(...prices)
  const span = Math.max(hi - lo, 1)
  const x = (p: number) => 6 + ((p - lo) / span) * (W - 12)

  const bids = cumulative(book.bids)
  const asks = cumulative(book.asks)
  const peak = Math.max(bids.at(-1)?.total ?? 0, asks.at(-1)?.total ?? 0, 1)
  const y = (c: number) => BASE - (c / peak) * (BASE - 8)

  // the deepest level runs out to the chart edge, the usual depth-chart convention, so a one-level side still has area
  const area = (pts: { price: number; total: number }[], edge: number) => {
    let d = `M${x(pts[0].price)},${BASE} L${x(pts[0].price)},${y(pts[0].total)}`
    for (let i = 1; i < pts.length; i++) {
      d += ` L${x(pts[i].price)},${y(pts[i - 1].total)} L${x(pts[i].price)},${y(pts[i].total)}`
    }
    return `${d} L${edge},${y(pts[pts.length - 1].total)} L${edge},${BASE} Z`
  }

  const bestBid = book.bids[0]?.price
  const bestAsk = book.asks[0]?.price
  const mid = bestBid != null && bestAsk != null ? x((bestBid + bestAsk) / 2) : null

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-[150px] w-full"
      role="img"
      aria-label={`Depth chart for ${book.symbol}: cumulative buy and sell volume by price`}
    >
      {bids.length > 0 && (
        <path d={area(bids, 6)} className="fill-emerald-500/20 stroke-emerald-500" strokeWidth="1.5" />
      )}
      {asks.length > 0 && (
        <path d={area(asks, W - 6)} className="fill-red-500/20 stroke-red-500" strokeWidth="1.5" />
      )}
      {mid != null && (
        <>
          <line x1={mid} x2={mid} y1="4" y2={BASE} className="stroke-zinc-400" strokeDasharray="3 3" />
          <text x={mid} y={H - 3} textAnchor="middle" className="fill-zinc-500 text-[10px]">
            spread {money(bestAsk! - bestBid!)}
          </text>
        </>
      )}
      <text x="6" y={H - 3} className="fill-zinc-400 text-[10px]">
        {money(lo)}
      </text>
      <text x={W - 6} y={H - 3} textAnchor="end" className="fill-zinc-400 text-[10px]">
        {money(hi)}
      </text>
    </svg>
  )
}
