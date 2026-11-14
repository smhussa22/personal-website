import { Cpu, Database, Globe, Layers, ShieldCheck, User } from 'lucide-react'
import { usePoll } from '../_lib/hooks'
import { CARD, LABEL, money } from '../_lib/format'
import type { Book, MyOrder, OrderState } from '../_lib/types'

type Phase = 'idle' | 'active' | 'waiting' | 'done'

const STEPS = [
  { icon: User, title: 'You', blurb: 'Pick a stock, a price and a size.' },
  { icon: Globe, title: 'HTTP gateway', blurb: 'Turns the web request into a call the exchange understands.' },
  { icon: ShieldCheck, title: 'Order gateway (C++)', blurb: 'Checks your key, rate limit and funds before anything else.' },
  { icon: Layers, title: 'Kafka', blurb: 'An append-only log. The order is written down before anything happens.' },
  { icon: Cpu, title: 'Matching engine (C++)', blurb: 'Pairs buyers with sellers. The engine itself takes about a microsecond.' },
  { icon: Database, title: 'Ledger and market data', blurb: 'Settles the money and updates every screen on this page.' },
]

const RAIL: Record<Phase, string> = {
  idle: 'bg-zinc-200 dark:bg-zinc-800',
  active: 'animate-pulse bg-amber-400',
  waiting: 'bg-sky-400',
  done: 'bg-emerald-500',
}

function Rail({ steps, phases, details }: { steps: typeof STEPS; phases: Phase[]; details?: string[] }) {
  return (
    <ol className="grid grid-cols-1 gap-4 md:grid-cols-6 md:gap-3">
      {steps.map((s, i) => {
        const Icon = s.icon
        return (
          <li key={s.title} className="flex gap-3 md:block">
            <div
              className={`hidden h-0.5 w-full rounded transition-colors duration-500 md:mb-3 md:block ${RAIL[phases[i]]}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            />
            <div
              className={`mt-0.5 h-8 w-0.5 shrink-0 rounded transition-colors duration-500 md:hidden ${RAIL[phases[i]]}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden />
                <span className="text-sm font-medium">{s.title}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{details?.[i] ?? s.blurb}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function OrderJourney({ order, book, now }: { order: MyOrder | null; book: Book | null; now: number }) {
  if (!order) {
    return (
      <div className={CARD}>
        <p className={LABEL}>How a trade works</p>
        <p className="mb-4 mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Place an order and this lights up with the real path your trade takes.
        </p>
        <Rail steps={STEPS} phases={STEPS.map(() => 'idle')} />
      </div>
    )
  }
  return <Live key={order.id} order={order} book={book} now={now} />
}

function Live({ order, book, now }: { order: MyOrder; book: Book | null; now: number }) {
  const age = now - order.sentAt
  const poll = usePoll<OrderState>(
    age < 60_000 ? `/api/maroof-street/order/${order.symbol}/${order.id}` : null,
    1000,
  )
  const fills = poll.data?.fills ?? []
  const filled = poll.data?.filled ?? 0
  const matched = filled > 0
  const side = order.side === 'buy' ? 'Buy' : 'Sell'

  const levels = book?.symbol === order.symbol ? (order.side === 'buy' ? book.bids : book.asks) : []
  const resting = order.type === 'gtc' && filled < order.qty && levels.some((l) => l.price === order.price && l.volume > 0)
  const noMatch = order.type === 'fak' && !matched && age > 3000

  const engine: Phase = matched ? 'done' : resting ? 'waiting' : noMatch ? 'idle' : 'active'
  const phases: Phase[] = ['done', 'done', 'done', 'done', engine, matched ? 'done' : 'idle']

  const avg = matched ? Math.round(fills.reduce((a, f) => a + f.price * f.qty, 0) / filled) : 0
  const details = [
    `${side} ${order.qty} ${order.symbol} at ${money(order.price)}`,
    'Validated your order and checked the rate limit.',
    `Verified the API key and reserved ${order.side === 'buy' ? `${money(order.price * order.qty)} cash` : `${order.qty} shares`}.`,
    `Logged to the commands.${order.symbol} topic.`,
    matched
      ? `Matched ${filled} of ${order.qty} shares.`
      : resting
        ? `Waiting in the book at ${money(order.price)} for a counterparty.`
        : noMatch
          ? 'Nothing to match against, so the order was cancelled.'
          : 'Looking for a match…',
    matched ? 'Balances settled and the trade published.' : 'Nothing to settle yet.',
  ]

  const counterparties = [...new Set(fills.map((f) => f.counterparty).filter(Boolean))].join(', ')
  const fillTimes = fills.map((f) => f.ts_ms).filter((t): t is number => !!t)
  const firstFill = fillTimes.length ? Math.min(...fillTimes) : 0

  return (
    <div className={CARD}>
      <p className={LABEL}>Your order · live</p>
      <p className="mb-4 mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {matched
          ? `Filled ${filled} of ${order.qty} at an average of ${money(avg)}${counterparties ? ` against ${counterparties}` : ''}${
              firstFill && firstFill > order.sentAt ? `, ${((firstFill - order.sentAt) / 1000).toFixed(2)}s after you sent it` : ''
            }.`
          : resting
            ? `Your ${order.side} order is resting in the book. It fills when someone trades against it.`
            : noMatch
              ? 'No one was offering that price, so a fill-now order cancels instead of waiting.'
              : 'Order accepted. Waiting for the engine…'}
      </p>
      <Rail steps={STEPS} phases={phases} details={details} />
    </div>
  )
}
