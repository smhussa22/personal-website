'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Cpu, Database, Globe, Layers, Radio, ShieldCheck, User, Wallet } from 'lucide-react'
import { BUY_TEXT, CARD, LABEL, SELL_TEXT, money } from '../_lib/format'
import type { MyOrder, OrderState } from '../_lib/types'

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

function Box({
  i, state, picked, onPick,
}: {
  i: number
  state: 'idle' | 'done' | 'active' | 'later'
  picked: boolean
  onPick: () => void
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
      className={`relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 text-center transition-all duration-500 hover:shadow-md ${tone} ${
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

export function YourOrder({ order, state }: { order: MyOrder | null; state: OrderState | null }) {
  const [picked, setPicked] = useState<number | null>(null)

  const fills = state?.fills ?? []
  const filled = state?.filled ?? 0
  const matched = fills.length > 0
  const times = fills.map((f) => f.ts_ms).filter((t): t is number => !!t)
  const firstFill = times.length ? Math.min(...times) : null
  const matchedIn = order && firstFill ? firstFill - order.sentAt : null
  const avg = matched ? Math.round(fills.reduce((a, f) => a + f.price * f.qty, 0) / filled) : 0
  const trace = state?.trace
  const settled = !!trace?.settled_ms

  // how far along the real order is, from facts we actually have
  const reached = !order ? -1 : settled ? NODES.length - 1 : matched ? 5 : ENGINE
  const current = !order ? -1 : settled ? -1 : matched ? 6 : ENGINE

  const stateOf = (i: number): 'idle' | 'done' | 'active' | 'later' =>
    !order ? 'idle' : i === current ? 'active' : i <= reached ? 'done' : 'later'
  const passed = (i: number) => !!order && i <= reached // the line leading into box i is lit

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
        return `Your order was written to the ${order.symbol} list, number ${order.id}, so it can never be lost.`
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

  // newest first, every line carries a real timestamp
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
    if (trace?.settled_ms) {
      log.push({ ts: trace.settled_ms, node: 6, text: 'The money moved and your wallet was updated.' })
    }
  }
  log.sort((a, b) => b.ts - a.ts)

  const shown = picked ?? (current >= 0 ? current : settled ? 7 : null)
  const side = order?.side === 'buy' ? BUY_TEXT : SELL_TEXT
  const box = (i: number) => <Box i={i} state={stateOf(i)} picked={shown === i} onPick={() => setPicked(picked === i ? null : i)} />

  return (
    <div className={`${CARD} space-y-5`} id="your-order">
      <div>
        <p className={LABEL}>{order ? 'Your order' : 'How a trade works'}</p>
        {!order ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Place an order and watch it travel through the exchange and come back to you. Click any box to see what it
            does.
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

      {/* wide screens: out along the top, down into the engine, back along the bottom to you */}
      <div className="hidden grid-cols-[1fr_28px_1fr_28px_1fr_28px_1fr] grid-rows-[96px_28px_96px] md:grid">
        <div className="col-start-1 row-start-1">{box(0)}</div>
        <div className="col-start-2 row-start-1"><Arrow dir="right" on={passed(1)} /></div>
        <div className="col-start-3 row-start-1">{box(1)}</div>
        <div className="col-start-4 row-start-1"><Arrow dir="right" on={passed(2)} /></div>
        <div className="col-start-5 row-start-1">{box(2)}</div>
        <div className="col-start-6 row-start-1"><Arrow dir="right" on={passed(3)} /></div>
        <div className="col-start-7 row-start-1">{box(3)}</div>
        <div className="col-start-7 row-start-2"><Arrow dir="down" on={passed(4)} /></div>
        <div className="col-start-7 row-start-3">{box(4)}</div>
        <div className="col-start-6 row-start-3"><Arrow dir="left" on={passed(5)} /></div>
        <div className="col-start-5 row-start-3">{box(5)}</div>
        <div className="col-start-4 row-start-3"><Arrow dir="left" on={passed(6)} /></div>
        <div className="col-start-3 row-start-3">{box(6)}</div>
        <div className="col-start-2 row-start-3"><Arrow dir="left" on={passed(7)} /></div>
        <div className="col-start-1 row-start-3">{box(7)}</div>
        <div className="col-start-1 row-start-2"><Arrow dir="up" on={passed(7)} /></div>
      </div>

      {/* phones: one column, top to bottom */}
      <div className="flex flex-col gap-1 md:hidden">
        {NODES.map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            {i > 0 && <Arrow dir="down" on={passed(i)} />}
            <div className="h-24">{box(i)}</div>
          </div>
        ))}
      </div>

      {shown !== null && (
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
