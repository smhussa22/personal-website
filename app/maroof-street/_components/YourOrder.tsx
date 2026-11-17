'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Check, Cpu, Database, Globe, Layers, Radio, ShieldCheck, User, Wallet } from 'lucide-react'
import { BUY_TEXT, CARD, LABEL, SELL_TEXT, money } from '../_lib/format'
import { isDone, type Tracked } from '../_lib/myOrders'
import { scrollBox } from './scroll'

type Node = {
  icon: typeof User
  title: string // the real component name
  short: string // what it is doing, in plain words
  about: string // what this part is, in plain words
}

// The trip an order takes, in the order it happens. The diagram draws it as one ring: out along the top, down into the
// matching engine, and back along the bottom to you.
const NODES: Node[] = [
  {
    icon: User,
    title: 'You',
    short: 'Press buy or sell',
    about: 'You choose a stock, buy or sell, and how many shares. Pressing the button sends that request to the exchange.',
  },
  {
    icon: Globe,
    title: 'HTTP Gateway',
    short: 'Checks your order makes sense',
    about:
      'The first stop, like a bank teller. It checks that the order is filled in properly, that the price is reasonable, that you have enough money or shares, and that you are not sending orders too fast. If something is wrong, it stops here.',
  },
  {
    icon: ShieldCheck,
    title: 'Order Gateway',
    short: 'Sets your money aside',
    about:
      'A C++ service that checks you are allowed to trade. For a buy it puts the money aside, and for a sell it puts the shares aside, so the same money cannot be spent on two orders at once.',
  },
  {
    icon: Layers,
    title: 'Kafka · commands',
    short: 'Writes your order down',
    about:
      'Every order is written to a permanent list (Kafka) before anything else happens. If something crashes, the exchange reads this list and picks up exactly where it left off, so no order is lost.',
  },
  {
    icon: Cpu,
    title: 'Matching Engine',
    short: 'Finds someone to trade with',
    about:
      'The heart of the exchange, written in C++. It looks for someone who wants the opposite of what you want, a seller for your buy or a buyer for your sell, at a price that works for both. It always picks the best price first, then whoever has been waiting longest. It does this in about a millionth of a second.',
  },
  {
    icon: Radio,
    title: 'Kafka · events',
    short: 'Announces what happened',
    about:
      'The engine does not phone anyone. It writes down what happened ("these two orders traded") on a second list, and every other part of the system reads it from there.',
  },
  {
    icon: Database,
    title: 'Ledger',
    short: 'Moves the money',
    about:
      'Reads the announcement and moves the money and shares between the two traders. A separate Market Data service reads the same announcement to update the order book and live feed on this page.',
  },
  {
    icon: Wallet,
    title: 'You',
    short: 'Your wallet is updated',
    about: 'The trade is done. Your cash and shares now show the result, and you can see it in your wallet.',
  },
]

const ENGINE = 4 // the box where a waiting order sits

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

const AFTER = 750 // ms between steps when a finished trade is played back

type BoxState = 'idle' | 'done' | 'active' | 'later'

function Box({ i, state, picked, onPick }: { i: number; state: BoxState; picked: boolean; onPick: () => void }) {
  const n = NODES[i]
  const Icon = n.icon
  const tone =
    state === 'done'
      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
      : state === 'active'
        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950'
        : 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900'
  return (
    <button
      onClick={onPick}
      aria-pressed={picked}
      className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-2 py-2 text-center shadow-sm transition-colors duration-500 hover:shadow-md ${tone} ${
        state === 'later' ? 'text-zinc-400 dark:text-zinc-500' : ''
      } ${picked ? 'outline outline-2 outline-offset-2 outline-sky-400' : ''}`}
    >
      {state === 'active' && <span className="absolute right-2 top-2 h-2 w-2 animate-ping rounded-full bg-amber-400" />}
      <span className="flex items-center gap-1.5">
        {state === 'done' ? (
          <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Icon className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
        )}
        <span className="text-[13px] font-semibold leading-tight">{n.title}</span>
      </span>
      <span className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">{n.short}</span>
    </button>
  )
}

// Where each box sits (as a percentage of the diagram). The ring is one closed line
// through every box; it fills in as the order moves, and the last stretch is the line back into "You".
type Layout = { pos: { x: number; y: number }[]; height: number; cols: number }

const WIDE: Layout = {
  height: 300,
  cols: 4,
  pos: [12.5, 37.5, 62.5, 87.5, 87.5, 62.5, 37.5, 12.5].map((x, i) => ({ x, y: i < 4 ? 20 : 80 })),
}
const NARROW: Layout = {
  height: 480,
  cols: 2,
  pos: [12.5, 37.5, 62.5, 87.5, 87.5, 62.5, 37.5, 12.5].map((y, i) => ({ x: i < 4 ? 25 : 75, y })),
}

function Ring({
  layout, reached, done, stateOf, shown, onPick, label,
}: {
  layout: Layout
  reached: number
  done: boolean // the whole trip is finished, so the line is closed back at You
  stateOf: (i: number) => BoxState
  shown: number | null
  onPick: (i: number) => void
  label: string | null
}) {
  const w = layout.cols === 4 ? 21 : 40 // box width, % of the diagram
  const h = layout.cols === 4 ? 104 : 96 // box height, px
  return (
    <div className="relative w-full" style={{ height: layout.height }}>
      {/* one solid line between each pair of boxes, and a closing line from the last box back up into You */}
      {NODES.map((_, i) => {
        const from = layout.pos[i]
        const to = layout.pos[(i + 1) % NODES.length]
        const horizontal = from.y === to.y
        const lit = i === NODES.length - 1 ? done : i + 1 <= reached
        const grow = horizontal ? (to.x > from.x ? 'left' : 'right') : to.y > from.y ? 'top' : 'bottom'
        return (
          <div
            key={`line-${i}`}
            className="absolute overflow-hidden rounded-full bg-zinc-300 dark:bg-zinc-700"
            style={{
              left: `${Math.min(from.x, to.x)}%`,
              top: `${Math.min(from.y, to.y)}%`,
              width: horizontal ? `${Math.abs(to.x - from.x)}%` : 4,
              height: horizontal ? 4 : `${Math.abs(to.y - from.y)}%`,
              transform: horizontal ? 'translateY(-50%)' : 'translateX(-50%)',
            }}
          >
            <div
              className="h-full w-full bg-emerald-500"
              style={{
                transform: horizontal ? `scaleX(${lit ? 1 : 0})` : `scaleY(${lit ? 1 : 0})`,
                transformOrigin: grow,
                transition: 'transform 600ms ease-out',
              }}
            />
          </div>
        )
      })}
      {label && (
        <p className="pointer-events-none absolute inset-x-[27%] top-1/2 -translate-y-1/2 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
      )}
      {NODES.map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${layout.pos[i].x}%`,
            top: `${layout.pos[i].y}%`,
            width: `${w}%`,
            height: h,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Box i={i} state={stateOf(i)} picked={shown === i} onPick={() => onPick(i)} />
        </div>
      ))}
    </div>
  )
}

export function YourOrder({
  items, selectedId, onSelect,
}: {
  items: Tracked[]
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  const tracked = items.find((t) => t.order.id === selectedId) ?? null
  const order = tracked?.order ?? null
  const state = tracked?.state ?? null
  const [picked, setPicked] = useState<number | null>(null)
  // null: show the order live. A number: a finished trade is being played back, and this many boxes are lit.
  const [step, setStep] = useState<number | null>(null)
  const [again, setAgain] = useState(0)

  const finished = !!tracked && isDone(tracked)
  useEffect(() => {
    setPicked(null)
    setStep(finished ? 0 : null)
    // only when a different trade is picked or "watch again" is pressed, never when a live order updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, again])
  useEffect(() => {
    if (step === null || step >= NODES.length - 1) return
    const t = setTimeout(() => setStep(step + 1), AFTER)
    return () => clearTimeout(t)
  }, [step])

  const fills = state?.fills ?? []
  const filled = state?.filled ?? 0
  const matched = fills.length > 0
  const times = fills.map((f) => f.ts_ms).filter((t): t is number => !!t)
  const firstFill = times.length ? Math.min(...times) : null
  const matchedIn = order && firstFill ? firstFill - order.sentAt : null
  const avg = matched ? Math.round(fills.reduce((a, f) => a + f.price * f.qty, 0) / filled) : 0
  const trace = state?.trace
  const settled = !!trace?.settled_ms || (!!order?.simulated && matched)

  // how far along the order is: from the real state while it is live, from the playback while a finished one replays
  const live = step === null
  const reached = !order ? -1 : !live ? step : settled ? NODES.length - 1 : matched ? 5 : ENGINE
  const current = !order ? -1 : !live ? (step < NODES.length - 1 ? step + 1 : -1) : settled ? -1 : matched ? 6 : ENGINE

  const stateOf = (i: number): 'idle' | 'done' | 'active' | 'later' =>
    !order ? 'idle' : i === current ? 'active' : i <= reached ? 'done' : 'later'
  
  const verb = order?.side === 'buy' ? 'buy' : 'sell'
  const hs = fills.some((f) => f.house)
  const who = (f: { house?: boolean; counterparty?: string | null }) =>
    f.house ? 'the demo house account' : (f.counterparty ?? 'another trader')

  // what each box did for THIS order, in plain words
  const mine = (i: number): string | null => {
    if (!order) return null
    const cost = order.side === 'buy' ? money(order.price * order.qty) : `${order.qty} ${order.symbol} shares`
    switch (i) {
      case 0:
        return `You asked to ${verb} ${order.qty} ${order.symbol} at ${money(order.price)} a share.`
      case 1:
        return `It confirmed ${money(order.price)} is a sensible price for ${order.symbol} and that you can afford it. Passed.`
      case 2:
        return `It set aside ${cost} for this order so it cannot be spent twice, then approved it.`
      case 3:
        return `Your order was written to the ${order.symbol} list as number ${order.id}, so it can never be lost.`
      case 4:
        if (!matched) return 'Your order is here now, waiting to be paired with someone.'
        return `It paired you with ${[...new Set(fills.map(who))].join(' and ')}: ${filled} of ${order.qty} shares${
          fills.length > 1 ? ` in ${fills.length} trades` : ''
        } at an average of ${money(avg)}.${trace?.swept_ms ? ` Your price did not come up in time, so it was moved to ${money(trace.moved_to ?? order.price)}.` : ''}`
      case 5:
        return matched ? 'The trade was announced here, and the accountant and this page both picked it up.' : null
      case 6:
        return settled
          ? `It moved ${money(avg * filled)} and ${filled} shares between you and ${who(fills[0])}.`
          : matched
            ? 'It is moving the money now.'
            : null
      case 7:
        return settled ? `Done. Your balance changed by ${money(avg * filled)}.` : null
    }
    return null
  }

  // newest first, every line carries a real timestamp; a replay only shows what it has reached so far
  const log: LogLine[] = []
  if (order) {
    log.push({ ts: order.sentAt, node: 0, text: `You sent your order: ${verb} ${order.qty} ${order.symbol}.` })
    if (trace?.received_ms && trace.received_ms !== order.sentAt) {
      log.push({ ts: trace.received_ms, node: 1, text: 'The HTTP Gateway got it and checked it.' })
    }
    log.push({ ts: order.ackedAt, node: 2, text: 'The Order Gateway approved it and Kafka wrote it down. It is on its way to the Matching Engine.' })
    if (trace?.swept_ms) {
      log.push({
        ts: trace.swept_ms,
        node: 4,
        text: `Nobody traded at your price, so it was moved to ${money(trace.moved_to ?? order.price)}, the nearest price that works.`,
      })
    }
    for (const f of fills) {
      log.push({ ts: f.ts_ms ?? order.ackedAt, node: 4, text: `Matched: ${f.qty} shares at ${money(f.price)} with ${who(f)}.` })
    }
    if (settled) {
      log.push({ ts: trace?.settled_ms ?? firstFill ?? order.ackedAt, node: 6, text: 'The Ledger moved the money and your wallet was updated.' })
    }
  }
  const visible = log.filter((l) => live || l.node <= reached).sort((a, b) => b.ts - a.ts)

  const shown = picked ?? (current >= 0 ? current : settled ? 7 : null)
  const side = order?.side === 'buy' ? BUY_TEXT : SELL_TEXT

  return (
    <div className="space-y-4" id="your-order">
      <div className={`${CARD} space-y-3`}>
        <div className="flex items-baseline justify-between gap-2">
          <p className={LABEL}>Your trades</p>
          {items.length > 0 && <p className="text-xs text-zinc-400">Pick one to watch it again</p>}
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Place an order and it appears here. Every trade you make stays in this list.
          </p>
        ) : (
          <ul className={`${scrollBox} max-h-44 space-y-1 pr-1`}>
            {[...items].reverse().map((t) => {
              const done = isDone(t)
              const sel = t.order.id === selectedId
              const first = t.state?.fills.map((f) => f.ts_ms).filter((x): x is number => !!x) ?? []
              return (
                <li key={t.order.id}>
                  <button
                    onClick={() => onSelect(t.order.id)}
                    aria-pressed={sel}
                    className={`flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      sel
                        ? 'bg-zinc-200/80 dark:bg-zinc-800'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className={t.order.side === 'buy' ? BUY_TEXT : SELL_TEXT}>
                      {t.order.side === 'buy' ? 'Bought' : 'Sold'}
                    </span>
                    <span className="tabular-nums">
                      {t.order.qty} {t.order.symbol} at {money(t.order.price)}
                    </span>
                    <span className="ml-auto text-xs text-zinc-400">
                      {clock(t.order.sentAt)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        done
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-400/15 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {done
                        ? `matched in ${duration(Math.min(...first) - t.order.sentAt)}`
                        : t.state && t.state.filled > 0
                          ? 'settling…'
                          : 'in progress…'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className={`${CARD} space-y-5`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className={LABEL}>{order ? (live ? 'Following your order live' : 'Playing back your trade') : 'How a trade works'}</p>
            {!order ? (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Place an order and watch it travel out through the exchange and come back to you. Click any box to see
                what it does.
              </p>
            ) : (
              <>
                <h2 className="mt-1 text-base font-medium">
                  {matched
                    ? `Your order matched in ${duration(matchedIn ?? 0)}`
                    : order.type === 'limit' && !trace?.swept_ms
                      ? 'Your order is waiting for a match…'
                      : 'Your order is being matched…'}
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
                  {hs && ' (the demo house account took the other side)'}
                </p>
              </>
            )}
          </div>
          {order && finished && (
            <button
              onClick={() => setAgain((n) => n + 1)}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              ↻ Watch again
            </button>
          )}
        </div>

        {/* the trip as one ring: out along the top, down into the engine, back along the bottom to you */}
        {(() => {
          const label = order ? (matched ? `Matched in ${duration(matchedIn ?? 0)}` : 'Waiting for a match') : 'Place an order to light this up'
          const onPick = (i: number) => setPicked(picked === i ? null : i)
          const done = !!order && reached === NODES.length - 1 && current < 0
          return (
            <>
              <div className="hidden md:block">
                <Ring layout={WIDE} reached={reached} done={done} stateOf={stateOf} shown={shown} onPick={onPick} label={label} />
              </div>
              <div className="md:hidden">
                <Ring layout={NARROW} reached={reached} done={done} stateOf={stateOf} shown={shown} onPick={onPick} label={null} />
              </div>
            </>
          )
        })()}

        {shown !== null && order && (
          <motion.div
            key={shown}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 rounded-lg bg-zinc-100/70 p-3 text-sm dark:bg-zinc-900/70"
          >
            <p className="font-medium">
              {shown + 1}. {NODES[shown].title}
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">{NODES[shown].about}</p>
            {mine(shown) && (
              <p className="rounded-md border-l-2 border-emerald-500 bg-white/60 px-3 py-2 text-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
                <span className="font-medium">In your trade: </span>
                {mine(shown)}
              </p>
            )}
          </motion.div>
        )}

        {order && (
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">What happened, newest first</p>
            <ul className="space-y-1.5">
              {visible.map((l) => (
                <motion.li
                  key={`${l.ts}-${l.node}-${l.text}`}
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
    </div>
  )
}
