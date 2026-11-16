// Per-visitor demo wallets. A visitor is an anonymous random id in a cookie; the wallet lives in Upstash Redis
// (REST, works from Vercel functions). Without the env vars it falls back to process memory, which is fine for
// local development but resets between serverless invocations.

export const START_CASH = 100_000
const WALLET_TTL_SECS = 60 * 60 * 24 * 30
const MAX_ORDERS_KEPT = 50

export type SimFill = { price: number; qty: number; ts_ms: number; counterparty: string; house?: boolean }
export type SimOrder = { symbol: string; qty: number; price: number; fills: SimFill[] }
export type Wallet = {
  cash: number
  positions: Record<string, number>
  orders: Record<string, SimOrder>
  order_seq: number
}

const URL = process.env.UPSTASH_REDIS_REST_URL
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const memory = new Map<string, { value: string; expires: number }>()

async function command(args: (string | number)[]): Promise<unknown> {
  const res = await fetch(URL!, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
    signal: AbortSignal.timeout(3000),
  })
  const json = (await res.json()) as { result?: unknown; error?: string }
  if (json.error) throw new Error(json.error)
  return json.result
}

async function getWallet(visitor: string): Promise<Wallet> {
  const key = `ms:wallet:${visitor}`
  let raw: string | null = null
  if (URL && TOKEN) raw = (await command(['GET', key])) as string | null
  else {
    const hit = memory.get(key)
    raw = hit && hit.expires > Date.now() ? hit.value : null
  }
  return raw ? (JSON.parse(raw) as Wallet) : { cash: START_CASH, positions: {}, orders: {}, order_seq: 0 }
}

async function putWallet(visitor: string, wallet: Wallet) {
  const key = `ms:wallet:${visitor}`
  const value = JSON.stringify(wallet)
  if (URL && TOKEN) await command(['SET', key, value, 'EX', WALLET_TTL_SECS])
  else memory.set(key, { value, expires: Date.now() + WALLET_TTL_SECS * 1000 })
}

// true if the caller may go ahead; false while the key's cooldown is still running
export async function takeCooldown(key: string, secs: number): Promise<number> {
  if (URL && TOKEN) {
    const ok = await command(['SET', `ms:cd:${key}`, 1, 'NX', 'EX', secs])
    return ok ? 0 : Number(await command(['TTL', `ms:cd:${key}`])) || secs
  }
  const hit = memory.get(`ms:cd:${key}`)
  if (hit && hit.expires > Date.now()) return Math.ceil((hit.expires - Date.now()) / 1000)
  memory.set(`ms:cd:${key}`, { value: '1', expires: Date.now() + secs * 1000 })
  return 0
}

export async function readWallet(visitor: string) {
  const w = await getWallet(visitor)
  return { cash: Math.round(w.cash), reserved: 0, positions: w.positions }
}

export async function readOrder(visitor: string, id: number) {
  const o = (await getWallet(visitor)).orders[String(id)]
  if (!o) return { known: false, qty: null, price: null, filled: 0, fills: [] }
  return { known: true, qty: o.qty, price: o.price, filled: o.fills.reduce((n, f) => n + f.qty, 0), fills: o.fills }
}

// Applies an order to the visitor's wallet. Cash and shares must cover the order up front (buy at the limit price,
// sell shares held), then only what actually filled changes hands. Callers fill any remainder with house liquidity, so orders end fully filled.
export async function applyOrder(
  visitor: string,
  order: { symbol: string; side: 'buy' | 'sell'; price: number; qty: number },
  fills: SimFill[],
  idBase: number,
): Promise<{ ok: true; id: number } | { ok: false; reason: string }> {
  const w = await getWallet(visitor)
  const held = w.positions[order.symbol] ?? 0
  if (order.side === 'buy' && w.cash < order.price * order.qty) return { ok: false, reason: 'insufficient_funds' }
  if (order.side === 'sell' && held < order.qty) return { ok: false, reason: 'insufficient_shares' }

  for (const f of fills) {
    const value = f.price * f.qty
    w.cash += order.side === 'buy' ? -value : value
    w.positions[order.symbol] = (w.positions[order.symbol] ?? 0) + (order.side === 'buy' ? f.qty : -f.qty)
  }

  const id = idBase + (w.order_seq++ % 100_000)
  w.orders[String(id)] = { symbol: order.symbol, qty: order.qty, price: order.price, fills }
  const ids = Object.keys(w.orders)
  if (ids.length > MAX_ORDERS_KEPT) delete w.orders[ids[0]]
  await putWallet(visitor, w)
  return { ok: true, id }
}
