import { useCallback, useEffect, useRef, useState } from 'react'
import type { MyOrder, OrderState } from './types'

export type Tracked = { order: MyOrder; state: OrderState | null }

const KEY = 'ms_orders_v1'
const KEEP = 30
const GIVE_UP_MS = 90_000

// an order is finished once it is fully filled and the ledger has settled it
export function isDone(t: Tracked): boolean {
  const s = t.state
  return !!s && s.known && s.filled >= t.order.qty && (!!s.trace?.settled_ms || !!t.order.simulated)
}

function load(): Tracked[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Tracked[]) : []
  } catch {
    return []
  }
}

// Keeps every order the visitor places, with the latest known state of each, across polls and page reloads.
// A poll that returns "unknown" (for example from a different server instance) never wipes what was already known.
export function useMyOrders(api: string, now: number) {
  const [items, setItems] = useState<Tracked[]>([])
  const ready = useRef(false)

  useEffect(() => {
    setItems(load())
    ready.current = true
  }, [])

  useEffect(() => {
    if (!ready.current) return
    try {
      localStorage.setItem(KEY, JSON.stringify(items.slice(-KEEP)))
    } catch {}
  }, [items])

  const add = useCallback((order: MyOrder, state: OrderState | null) => {
    setItems((prev) => [...prev.filter((t) => t.order.id !== order.id), { order, state }].slice(-KEEP))
  }, [])

  // poll every order that is not finished yet
  const open = items.filter((t) => !isDone(t) && now - t.order.sentAt < GIVE_UP_MS).map((t) => t.order)
  const openKey = open.map((o) => o.id).join(',')
  useEffect(() => {
    if (!openKey) return
    let stopped = false
    const tick = async () => {
      if (document.hidden) return
      for (const o of open) {
        try {
          const res = await fetch(`${api}/order/${o.symbol}/${o.id}`, { cache: 'no-store' })
          if (!res.ok) continue
          const next = (await res.json()) as OrderState
          if (stopped || !next.known) continue
          setItems((prev) =>
            prev.map((t) => {
              if (t.order.id !== o.id) return t
              const cur = t.state
              // never go backwards: keep whichever answer has seen more
              const better = !cur || next.filled > cur.filled || (next.trace?.settled_ms && !cur.trace?.settled_ms) || next.fills.length >= cur.fills.length
              return better ? { ...t, state: next } : t
            }),
          )
        } catch {}
      }
    }
    tick()
    const id = setInterval(tick, 800)
    return () => {
      stopped = true
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, openKey])

  return { items, add }
}
