'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { usePoll, useNow } from './_lib/hooks'
import { CARD, LABEL } from './_lib/format'
import type {
  Account,
  Book,
  Market,
  MarketState,
  MyOrder,
  OrderState,
  Status,
  SymbolName,
  TraderStat,
  Trade,
} from './_lib/types'
import { StatusPill } from './_components/StatusPill'
import { StatsRow } from './_components/StatsRow'
import { Ticker } from './_components/Ticker'
import { DepthChart } from './_components/DepthChart'
import { Ladder } from './_components/Ladder'
import { OrderForm } from './_components/OrderForm'
import { YourOrder } from './_components/YourOrder'
import { Feed } from './_components/Feed'
import { Traders } from './_components/Traders'

const API = '/api/maroof-street'

const VARIANTS_CONTAINER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const VARIANTS_SECTION = {
  hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
}
const TRANSITION = { duration: 0.3 }

export default function MaroofStreet() {
  const [symbol, setSymbol] = useState<SymbolName>('AAPL')
  const [pick, setPick] = useState<{ price: number; n: number } | null>(null)
  const [orders, setOrders] = useState<MyOrder[]>([])
  const [skew, setSkew] = useState(0)

  const status = usePoll<Status>(`${API}/status`, 5000)
  // while the exchange is down only the status check keeps running, and it also notices when the market reopens
  const paused = status.data?.open === false || status.failures >= 2
  const live = (path: string) => (paused ? null : `${API}/${path}`)
  const market = usePoll<Market>(live('market'), 1500)
  const tape = usePoll<Trade[]>(live('tape?limit=100'), 1500)
  const book = usePoll<Book>(live(`book/${symbol}?levels=10`), 1500)
  const account = usePoll<Account>(live('account'), 5000)
  const traders = usePoll<TraderStat[]>(live('traders'), 3000)

  useEffect(() => {
    if (market.data) setSkew(market.data.server_ms - Date.now())
  }, [market.data])
  const now = useNow(skew)

  const closed = paused || market.failures >= 2
  const state: MarketState = closed
    ? 'closed'
    : status.data?.mode === 'sim'
      ? 'sim'
      : status.data?.open
        ? 'open'
        : 'connecting'

  const stats = market.data?.symbols.find((s) => s.symbol === symbol)
  const bookData = book.data?.symbol === symbol ? book.data : null
  const myIds = useMemo(() => new Set(orders.map((o) => o.id)), [orders])
  const latest = orders[orders.length - 1] ?? null

  // the newest order's fills, shared by the order panel, the book highlight and the activity feed
  const orderState = usePoll<OrderState>(
    latest && now - latest.sentAt < 60_000 ? `${API}/order/${latest.symbol}/${latest.id}` : null,
    700,
  )
  const mine = latest && orderState.data?.known ? orderState.data : null
  const myPrices = useMemo(
    () => new Set(latest && latest.symbol === symbol && now - latest.sentAt < 30_000 ? [latest.price, ...(mine?.fills.map((f) => f.price) ?? [])] : []),
    [latest, mine, symbol, now],
  )
  const myTrades: Trade[] = latest && mine
    ? mine.fills.map((f) => ({
        symbol: latest.symbol,
        price: f.price,
        qty: f.qty,
        side: latest.side,
        ts_ms: f.ts_ms,
        taker: 'You',
        maker: f.house ? 'demo liquidity' : f.counterparty,
        taker_id: latest.id,
      }))
    : []

  return (
    <motion.main
      className="relative left-1/2 w-[min(100vw-2rem,64rem)] -translate-x-1/2 space-y-8 pb-16"
      variants={VARIANTS_CONTAINER}
      initial="hidden"
      animate="visible"
    >
      <motion.section variants={VARIANTS_SECTION} transition={TRANSITION}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 text-lg font-medium">Maroof Street</h1>
            <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
              A stock exchange I built from scratch: a C++ matching engine, Kafka, Postgres and Redis. Five bots
              trade on it while it is open. Place your own order and watch it match.
            </p>
          </div>
          <StatusPill state={state} />
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          {state === 'sim'
            ? 'A simulated market that runs around the clock. The trades and prices are generated, and your orders are matched in the simulation. The real exchange (C++ engine, Kafka) runs when I switch it on, and this page shows it then.'
            : 'Simulated market. Prices are made-up reference values, not real quotes.'}
        </p>
      </motion.section>

      {closed ? (
        <motion.section variants={VARIANTS_SECTION} transition={TRANSITION}>
          <div className={CARD}>
            <p className="text-base font-medium">The market is closed.</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {status.data?.nextOpen
                ? `It opens ${status.data.nextOpen}.`
                : 'It opens when the exchange is next brought online.'}{' '}
              Maroof Street runs on a real matching engine that I switch on like a trading day, so it is not
              always running. Here is how it works while you wait.
            </p>
          </div>
        </motion.section>
      ) : (
        <>
          <motion.section variants={VARIANTS_SECTION} transition={TRANSITION} className="space-y-3">
            <StatsRow market={market.data} now={now} />
            <Ticker symbols={market.data?.symbols ?? []} selected={symbol} onSelect={setSymbol} />
          </motion.section>

          <motion.section
            variants={VARIANTS_SECTION}
            transition={TRANSITION}
            className="grid gap-6 lg:grid-cols-5"
          >
            <div className="space-y-3 lg:col-span-3">
              <div>
                <p className={LABEL}>Order book · {symbol}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Orders waiting for a match. Green are buyers, red are sellers. Click a price to use it.
                </p>
              </div>
              <div className={`${CARD} space-y-4`}>
                <DepthChart book={bookData} />
                <Ladder book={bookData} mine={myPrices} onPick={(price) => setPick({ price, n: Date.now() })} />
              </div>
            </div>
            <div className="lg:col-span-2">
              <OrderForm
                symbol={symbol}
                stats={stats}
                pick={pick}
                account={account.data}
                disabled={state !== 'open' && state !== 'sim'}
                skew={skew}
                onOrder={(o) => {
                  setOrders((prev) => [...prev, o])
                  setTimeout(() => document.getElementById('your-order')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
                }}
              />
            </div>
          </motion.section>
        </>
      )}

      <motion.section variants={VARIANTS_SECTION} transition={TRANSITION}>
        <YourOrder order={closed ? null : latest} state={orderState.data} />
      </motion.section>

      {!closed && (
        <motion.section variants={VARIANTS_SECTION} transition={TRANSITION}>
          <Feed tape={tape.data} mineTrades={myTrades} symbol={symbol} myIds={myIds} now={now} />
        </motion.section>
      )}

      <motion.section variants={VARIANTS_SECTION} transition={TRANSITION}>
        <Traders traders={traders.data} now={now} closed={closed} />
      </motion.section>
    </motion.main>
  )
}
