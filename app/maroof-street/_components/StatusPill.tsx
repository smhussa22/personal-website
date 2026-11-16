import type { MarketState } from '../_lib/types'

const COPY: Record<MarketState, { label: string; dot: string; text: string }> = {
  open: { label: 'Market open', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  closed: { label: 'Market closed', dot: 'bg-zinc-400', text: 'text-zinc-600 dark:text-zinc-400' },
  replay: { label: 'Replay of a recorded session', dot: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-300' },
  connecting: { label: 'Connecting…', dot: 'bg-amber-400', text: 'text-zinc-600 dark:text-zinc-400' },
}

export function StatusPill({ state }: { state: MarketState }) {
  const c = COPY[state]
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium dark:bg-zinc-800"
    >
      <span className="relative flex h-2 w-2">
        {state !== 'closed' && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${c.dot}`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${c.dot}`} />
      </span>
      <span className={c.text}>{c.label}</span>
    </span>
  )
}
