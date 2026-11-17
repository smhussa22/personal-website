'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Cpu, Database, Globe, Layers, Radio, ShieldCheck, User, Wallet } from 'lucide-react'
import { BUY_TEXT, CARD, LABEL, SELL_TEXT, money } from '../_lib/format'
import { isDone, type Tracked } from '../_lib/myOrders'
import { scrollBox } from './scroll'

type Node = {
  icon: typeof User
  title: string
  short: string // one line under the box
  about: string // what this part is, in plain words
}

// The trip an order takes: out from you along the top, down into the matching engine, and back along the bottom to you.
const NODES: Node[] = [
  {
    icon: User,
    title: 'You',
    short: 'Send an order',
    about: 'You choose a stock, buy or sell, and how many shares. Pressing the button sends that request to the exchange.',
  },
  {
    icon: Globe,
    title: 'Front desk',
    short: 'Checks it makes sense',
    about:
      'The first stop, like a bank teller. It checks that the order is filled in properly, that the price is reasonable, that you have enough money or shares, and that you are not sending orders too fast. If something is wrong, it stops here.',
  },
  {
    icon: ShieldCheck,
    title: 'Security check',
    short: 'Sets your money aside',
    about:
      'A second check that you are allowed to trade. For a buy it puts the money aside, and for a sell it puts the shares aside, so the same money cannot be spent on two orders at once.',
  },
  {
    icon: Layers,
    title: 'Order list',
    short: 'Writes it down',
    about:
      'Every order is written to a permanent list (this is Kafka) before anything else happens. If something crashes, the exchange reads this list and picks up exactly where it left off, so no order is lost.',
  },
  {
    icon: Cpu,
    title: 'Matching engine',
    short: 'Finds who to trade with',
    about:
      'The heart of the exchange. It looks for someone who wants the opposite of what you want, a seller for your buy or a buyer for your sell, at a price that works for both. It always picks the best price first, then whoever has been waiting longest. It does this in about a millionth of a second.',
  },
  {
    icon: Radio,
    title: 'Results list',
    short: 'Announces what happened',
    about:
      'The engine does not phone anyone. It writes down what happened ("these two orders traded") on a second list, and every other part of the system reads it from there.',
  },
  {
    icon: Database,
    title: 'Accountant',
    short: 'Moves the money',
    about:
      'The ledger reads the results and moves the money and shares between the two traders. A separate service updates the order book and live feed on this page from the same results.',
  },
  {
    icon: Wallet,
    title: 'Back to you',
    short: 'Your wallet is updated',
    about: 'The trade is done. Your cash and shares now show the result, and you can see it in your account.',
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

function Box({
  i, state, picked, onPick, time,
}: {
  i: number
  state: 'idle' | 'done' | 'active' | 'later'
  picked: boolean
  onPick: () => void
  time: string | null
}) {
  const n = NODES[i]
  const Icon = n.icon
  const tone =
    state === 'done'
      ? 'border-emerald-500 bg-emerald-500/10'
      : state === 'active'
        ? 'border-amber-400 bg-amber-400/10'
        : 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900'
  return (
    <button
      onClick={onPick}
      aria-pressed={picked}
      className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl border-2 p-2 text-center transition-all duration-500 hover:shadow-md ${tone} ${
        state === 'later' ? 'opacity-50' : ''
      } ${picked ? 'outline outline-2 outline-offset-2 outline-sky-400' : ''}`}
    >
      <span className="absolute left-2 top-1.5 text-[10px] font-semibold tabular-nums text-zinc-400">{i + 1}</span>
      {state === 'active' && <span className="absolute right-2 top-2 h-2 w-2 animate-ping rounded-full bg-amber-400" />}
      {state === 'done' ? (
        <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Icon className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
      )}
      <span className="text-sm font-medium">{n.title}</span>
      <span className="text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">{n.short}</span>
      <span className="h-3 font-mono text-[10px] tabular-nums text-emerald-600 dark:text-emerald-400">
        {state === 'done' && time ? time : ''}
      </span>
    </button>
  )
}

function Arrow({ dir, on }: { dir: 'right' | 'left' | 'up' | 'down'; on: boolean }) {
  const I = { right: ArrowRight, left: ArrowLeft, up: ArrowUp, down: ArrowDown }[dir]
  return (
    <span className="flex items-center justify-center">
      <I className={`h-5 w-5 transition-colors duration-500 ${on ? 'text-emerald-500' : 'text-zinc-300 dark:text-zinc-700'}`} />
    </span>
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
  const passed = (i: number) => !!order && i <= reached // the arrow into box i is lit

  // the real moment each box was reached, as time since you pressed the button
  const at = (i: number): string | null => {
    if (!order) return null
    const real = [order.sentAt, trace?.received_ms ?? order.ackedAt, order.ackedAt, order.ackedAt, firstFill, firstFill, trace?.settled_ms ?? firstFill, trace?.settled_ms ?? firstFill][i]
    return real ? (i === 0 ? 'start' : `+${duration(real - order.sentAt)}`) : null
  }

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
      log.push({ ts: trace.received_ms, node: 1, text: 'The front desk got it and checked it.' })
    }
    log.push({ ts: order.ackedAt, node: 2, text: 'The exchange approved it and wrote it down. It is on its way to the matching engine.' })
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
      log.push({ ts: trace?.settled_ms ?? firstFill ?? order.ackedAt, node: 6, text: 'The money moved and your wallet was updated.' })
    }
  }
  const visible = log.filter((l) => live || l.node <= reached).sort((a, b) => b.ts - a.ts)

  const shown = picked ?? (current >= 0 ? current : settled ? 7 : null)
  const side = order?.side === 'buy' ? BUY_TEXT : SELL_TEXT
  const box = (i: number) => (
    <Box i={i} state={stateOf(i)} time={at(i)} picked={shown === i} onPick={() => setPicked(picked === i ? null : i)} />
  )

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

        {/* wide screens: out along the top, down into the engine, back along the bottom to you */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[1fr_28px_1fr_28px_1fr_28px_1fr] grid-rows-[22px_104px_30px_104px_22px]">
            <p className="col-span-7 row-start-1 pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              Your order goes out
            </p>
            <div className="col-start-1 row-start-2">{box(0)}</div>
            <div className="col-start-2 row-start-2"><Arrow dir="right" on={passed(1)} /></div>
            <div className="col-start-3 row-start-2">{box(1)}</div>
            <div className="col-start-4 row-start-2"><Arrow dir="right" on={passed(2)} /></div>
            <div className="col-start-5 row-start-2">{box(2)}</div>
            <div className="col-start-6 row-start-2"><Arrow dir="right" on={passed(3)} /></div>
            <div className="col-start-7 row-start-2">{box(3)}</div>
            <div className="col-start-7 row-start-3"><Arrow dir="down" on={passed(4)} /></div>
            <div className="col-start-7 row-start-4">{box(4)}</div>
            <div className="col-start-6 row-start-4"><Arrow dir="left" on={passed(5)} /></div>
            <div className="col-start-5 row-start-4">{box(5)}</div>
            <div className="col-start-4 row-start-4"><Arrow dir="left" on={passed(6)} /></div>
            <div className="col-start-3 row-start-4">{box(6)}</div>
            <div className="col-start-2 row-start-4"><Arrow dir="left" on={passed(7)} /></div>
            <div className="col-start-1 row-start-4">{box(7)}</div>
            <div className="col-start-1 row-start-3"><Arrow dir="up" on={passed(7)} /></div>
            <p className="col-span-7 row-start-5 pt-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              The result comes back to you
            </p>
          </div>
        </div>

        {/* phones: down the left side into the engine, back up the right side to you */}
        <div className="grid grid-cols-[1fr_24px_1fr] grid-rows-[112px_24px_112px_24px_112px_24px_112px] md:hidden">
          <div className="col-start-1 row-start-1">{box(0)}</div>
          <div className="col-start-2 row-start-1"><Arrow dir="left" on={passed(7)} /></div>
          <div className="col-start-3 row-start-1">{box(7)}</div>
          <div className="col-start-1 row-start-2"><Arrow dir="down" on={passed(1)} /></div>
          <div className="col-start-3 row-start-2"><Arrow dir="up" on={passed(7)} /></div>
          <div className="col-start-1 row-start-3">{box(1)}</div>
          <div className="col-start-3 row-start-3">{box(6)}</div>
          <div className="col-start-1 row-start-4"><Arrow dir="down" on={passed(2)} /></div>
          <div className="col-start-3 row-start-4"><Arrow dir="up" on={passed(6)} /></div>
          <div className="col-start-1 row-start-5">{box(2)}</div>
          <div className="col-start-3 row-start-5">{box(5)}</div>
          <div className="col-start-1 row-start-6"><Arrow dir="down" on={passed(3)} /></div>
          <div className="col-start-3 row-start-6"><Arrow dir="up" on={passed(5)} /></div>
          <div className="col-start-1 row-start-7">{box(3)}</div>
          <div className="col-start-2 row-start-7"><Arrow dir="right" on={passed(4)} /></div>
          <div className="col-start-3 row-start-7">{box(4)}</div>
        </div>

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
