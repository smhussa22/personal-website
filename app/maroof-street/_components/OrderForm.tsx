import { useEffect, useState } from 'react'
import { BUY_TEXT, CARD, LABEL, SELL_TEXT, friendlyReason, int, money } from '../_lib/format'
import type { Account, MyOrder, OrderAck, SymbolName, SymbolStats } from '../_lib/types'

type Props = {
  symbol: SymbolName
  stats: SymbolStats | undefined
  pick: { price: number; n: number } | null
  account: Account | null
  disabled: boolean
  skew: number
  onOrder: (o: MyOrder) => void
}

const FIELD =
  'w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus-visible:ring-2 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-600'

export function OrderForm({ symbol, stats, pick, account, disabled, skew, onOrder }: Props) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const type = 'gtc' as const // every demo order waits in the book; the house completes it
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('10')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    setTouched(false)
    setMsg(null)
  }, [symbol])

  const suggested = (side === 'buy' ? stats?.best_ask : stats?.best_bid) || stats?.last || 0
  useEffect(() => {
    if (!touched && suggested) setPrice(String(suggested))
  }, [touched, suggested, symbol, side])

  useEffect(() => {
    if (pick) {
      setPrice(String(pick.price))
      setTouched(true)
    }
  }, [pick])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const p = Number(price)
  const q = Number(qty)
  const valid = Number.isInteger(p) && p > 0 && Number.isInteger(q) && q >= 1 && q <= 100

  const submit = async () => {
    if (!valid) {
      setMsg({ ok: false, text: 'Enter a whole-dollar price and a quantity from 1 to 100.' })
      return
    }
    setSubmitting(true)
    setMsg(null)
    const sentAt = Date.now() + skew
    try {
      const res = await fetch('/api/maroof-street/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, side, price: p, quantity: q, type }),
      })
      const ack: OrderAck = await res.json()
      if (ack.accepted && ack.order_id) {
        setMsg({
          ok: true,
          text: ack.repriced_from
            ? `Your price of ${money(ack.repriced_from)} was away from the market, so it was moved to ${money(ack.price ?? p)} to make sure it trades. Follow it just below.`
            : 'Order accepted. Follow it just below.',
        })
        onOrder({ id: ack.order_id, symbol, side, type, price: ack.price ?? p, qty: q, sentAt, ackedAt: Date.now() + skew, simulated: ack.simulated })
        setCooldown(3)
      } else if (ack.accepted === undefined) {
        setMsg({ ok: false, text: friendlyReason({ reason: 'gateway_unavailable' }, symbol) })
      } else {
        setMsg({ ok: false, text: friendlyReason(ack, symbol) })
        if (ack.reason === 'rate_limited') setCooldown(ack.retry_after ?? 3)
      }
    } catch {
      setMsg({ ok: false, text: friendlyReason({ reason: 'gateway_unavailable' }, symbol) })
    } finally {
      setSubmitting(false)
    }
  }

  const blocked = disabled || submitting || cooldown > 0

  return (
    <div className="space-y-4">
      <div className={`${CARD} space-y-3`}>
        <p className={LABEL}>Place an order · {symbol}</p>

        <div className="flex gap-2" role="group" aria-label="Side">
          {(['buy', 'sell'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              aria-pressed={side === s}
              className={`flex-1 rounded-full py-1.5 text-sm font-medium capitalize transition-all duration-150 active:scale-[0.98] ${
                side === s
                  ? s === 'buy'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-red-500 text-white'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="ms-price" className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
              Price per share ($)
            </label>
            <input
              id="ms-price"
              type="number"
              min="1"
              inputMode="numeric"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value)
                setTouched(true)
              }}
              className={FIELD}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="ms-qty" className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
              Shares (1 to 100)
            </label>
            <input
              id="ms-qty"
              type="number"
              min="1"
              max="100"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={FIELD}
            />
          </div>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Your order waits in the book at your price. In this demo it always completes: if nobody else is offering
          that price, a house account takes the other side.
        </p>

        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{side === 'buy' ? 'Estimated cost' : 'Estimated proceeds'}</span>
          <span className="tabular-nums">{valid ? money(p * q) : '—'}</span>
        </div>

        <button
          onClick={submit}
          disabled={blocked}
          className="w-full rounded-full bg-zinc-950 py-2 text-sm font-medium text-zinc-50 transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {disabled
            ? 'Market closed'
            : submitting
              ? 'Sending…'
              : cooldown > 0
                ? `Wait ${cooldown}s`
                : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
        </button>

        <p aria-live="polite" className={`min-h-5 text-sm ${msg ? (msg.ok ? BUY_TEXT : SELL_TEXT) : ''}`}>
          {msg && `${msg.ok ? '✓' : '✗'} ${msg.text}`}
        </p>
      </div>

      <div className={CARD}>
        <p className={LABEL}>Shared demo account</p>
        <p className="mb-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Every visitor trades from this one account, so the numbers move even when you are not trading.
        </p>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Cash</span>
          <span className="tabular-nums">{money(account?.cash)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">{symbol} shares</span>
          <span className="tabular-nums">{int(account?.positions[symbol])}</span>
        </div>
      </div>
    </div>
  )
}
