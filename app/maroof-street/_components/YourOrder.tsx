'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, Cpu, Database, Globe, Layers, Radio, ShieldCheck, User } from 'lucide-react'
import { BUY_TEXT, CARD, LABEL, SELL_TEXT, money } from '../_lib/format'
import type { MyOrder, OrderState } from '../_lib/types'

type Node = { icon: typeof User; title: string; about: string }

const NODES: Node[] = [
  {
    icon: User,
    title: 'You',
    about: 'You pick a stock, a side, a price and a number of shares. That is the whole order.',
  },
  {
    icon: Globe,
    title: 'HTTP gateway',
    about:
      'A small web service in front of the exchange. It checks the order is well formed, within 15% of the market price, and not coming too fast from one visitor, then passes it on as a gRPC call.',
  },
  {
    icon: ShieldCheck,
    title: 'Order gateway',
    about:
      'A C++ service that checks the API key and rate limit, then reserves the money (for a buy) or the shares (for a sell) so the same funds cannot be spent twice. A failed check is rejected here and never reaches the engine.',
  },
  {
    icon: Layers,
    title: 'Kafka log',
    about:
      'An append-only log. Every accepted order is written to a per-stock topic before anything acts on it. If the engine crashes it replays this log and rebuilds the same order book.',
  },
  {
    icon: Cpu,
    title: 'Matching engine',
    about:
      'One C++ engine per stock with a lock-free order book. It pairs buyers with sellers, best price first, then oldest order first. Matching an order takes about a microsecond.',
  },
  {
    icon: Radio,
    title: 'Event stream',
    about:
      'The engine does not call anyone. It publishes what happened (accepted, filled, cancelled) to a second Kafka topic, and every other service reads from there.',
  },
  {
    icon: Database,
    title: 'Ledger & market data',
    about:
      'The ledger moves money and shares between the two accounts and returns any reserved cash you did not spend. Market data updates the book, ticker and trade feed on this page.',
  },
]

const ENGINE = 4

type LogLine = { ts: number; node: number; text: string }

function clock(ts: number) {
  const d = new Date(ts)
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

function duration(ms: number) {
  const v = Math.max(0, ms)
  return v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(2)} s`
}

export function YourOrder({ order, state }: { order: MyOrder | null; state: OrderState | null }) {
  const [picked, setPicked] = useState<number | null>(null)

  const fills = state?.fills ?? []
  const filled = state?.filled ?? 0
  const matched = fills.length > 0
  const times = fills.map((f) => f.ts_ms).filter((t): t is number => !!t)
  const firstFill = times.length ? Math.min(...times) : null
  const matchedIn = order && firstFill ? firstFill - order.sentAt : null
  const avg = matched ? Math.round(fills.reduce((a, f) => a + f.price * f.qty, 0) / filled) : 0

  // how far along the real order is, from facts we actually have
  const reached = !order ? -1 : matched ? NODES.length - 1 : ENGINE
  const current = !order ? -1 : matched ? -1 : ENGINE

  // newest first, every line carries a real timestamp
  const log: LogLine[] = []
  if (order) {
    log.push({ ts: order.sentAt, node: 0, text: `You sent: ${order.side} ${order.qty} ${order.symbol} at ${money(order.price)}.` })
    log.push({
      ts: order.ackedAt,
      node: 2,
      text: `The exchange accepted it. Checks passed and ${
        order.side === 'buy' ? money(order.price * order.qty) : `${order.qty} shares`
      } were reserved. It was written to the log and sent to the ${order.symbol} engine.`,
    })
    const trace = state?.trace
    if (trace?.received_ms && trace.received_ms !== order.sentAt) {
      log.push({ ts: trace.received_ms, node: 1, text: 'The HTTP gateway received it and checked the price, your wallet and the rate limit.' })
    }
    if (trace?.settled_ms) {
      log.push({ ts: trace.settled_ms, node: 6, text: 'The ledger settled the trade and your wallet was updated.' })
    }
    for (const f of fills) {
      log.push({
        ts: f.ts_ms ?? order.ackedAt,
        node: 4,
        text: `Matched ${f.qty} at ${money(f.price)} with ${
          f.house ? 'demo liquidity (the house)' : (f.counterparty ?? 'another trader')
        }.`,
      })
    }
  }
  log.sort((a, b) => b.ts - a.ts)

  const shown = picked ?? (current >= 0 ? current : matched ? ENGINE : null)
  const side = order?.side === 'buy' ? BUY_TEXT : SELL_TEXT

  return (
    <div className={`${CARD} space-y-5`} id="your-order">
      <div>
        <p className={LABEL}>{order ? 'Your order' : 'How a trade works'}</p>
        {!order ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Place an order and follow it through the exchange here, with the real time it took. Click any step to see
            what it does.
          </p>
        ) : (
          <>
            <h2 className="mt-1 text-base font-medium">
              {matched
                ? `Your order matched in ${duration(matchedIn ?? 0)}`
                : 'Your order is at the matching engine…'}
              {order.simulated && (
                <span className="ml-2 rounded-full bg-sky-500/10 px-2 py-0.5 align-middle text-xs font-normal text-sky-700 dark:text-sky-300">
                  simulated fill
                </span>
              )}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              <span className={side}>{order.side === 'buy' ? 'Buy' : 'Sell'}</span> {order.qty} {order.symbol} at{' '}
              {money(order.price)}
              {matched && ` · filled ${filled} of ${order.qty} at an average of ${money(avg)}`}
            </p>
          </>
        )}
      </div>

      <ol className="relative flex flex-col gap-3 md:flex-row md:justify-between md:gap-0">
        <div
          aria-hidden
          className="absolute left-[7.14%] right-[7.14%] top-[18px] hidden h-0.5 rounded bg-zinc-200 dark:bg-zinc-800 md:block"
        >
          <motion.div
            className="h-full rounded bg-emerald-500"
            animate={{ width: `${(Math.max(0, reached) / (NODES.length - 1)) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        {NODES.map((n, i) => {
          const Icon = n.icon
          const done = i <= reached && i !== current
          const active = i === current
          return (
            <li key={n.title} className="md:w-[14.285%]">
              <button
                onClick={() => setPicked(picked === i ? null : i)}
                aria-pressed={picked === i}
                className="flex w-full items-center gap-3 text-left md:flex-col md:gap-2 md:text-center"
              >
                <span
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 transition-colors duration-500 ${
                    done
                      ? 'bg-emerald-500 text-white ring-emerald-500'
                      : active
                        ? 'bg-amber-400 text-zinc-900 ring-amber-400'
                        : 'bg-white text-zinc-400 ring-zinc-300 dark:bg-zinc-900 dark:ring-zinc-700'
                  } ${shown === i ? 'outline outline-2 outline-offset-2 outline-sky-400' : ''}`}
                >
                  {active && <span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-40" />}
                  {done ? <Check className="relative h-4 w-4" /> : <Icon className="relative h-4 w-4" />}
                </span>
                <span
                  className={`text-xs font-medium transition-opacity duration-500 ${
                    order && i > reached ? 'opacity-40' : ''
                  }`}
                >
                  {n.title}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {shown !== null && (
        <motion.div
          key={shown}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-lg bg-zinc-100/70 p-3 text-sm dark:bg-zinc-900/70"
        >
          <p className="font-medium">{NODES[shown].title}</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">{NODES[shown].about}</p>
        </motion.div>
      )}

      {order && (
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            What happened, newest first
          </p>
          <ul className="space-y-1.5">
            {log.map((l, i) => (
              <motion.li
                key={`${l.ts}-${i}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <button
                  onClick={() => setPicked(l.node)}
                  className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                >
                  <span className="font-mono text-xs tabular-nums text-zinc-400">{clock(l.ts)}</span>
                  <span className="font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{duration(l.ts - order.sentAt)}
                  </span>
                  <span className="min-w-0 flex-1 basis-64 text-zinc-700 dark:text-zinc-300">{l.text}</span>
                </button>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
