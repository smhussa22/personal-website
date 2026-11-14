import { useEffect, useRef, useState } from 'react'

// Polls a JSON endpoint; skips ticks while the tab is hidden so idle visitors don't load the exchange.
export function usePoll<T>(url: string | null, intervalMs: number) {
  const [data, setData] = useState<T | null>(null)
  const [failures, setFailures] = useState(0)

  useEffect(() => {
    if (!url) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      if (!document.hidden) {
        try {
          const res = await fetch(url, { cache: 'no-store' })
          if (!res.ok) throw new Error(String(res.status))
          const json = (await res.json()) as T
          if (!stopped) {
            setData(json)
            setFailures(0)
          }
        } catch {
          if (!stopped) setFailures((f) => f + 1)
        }
      }
      if (!stopped) timer = setTimeout(tick, intervalMs)
    }

    tick()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [url, intervalMs])

  return { data, failures }
}

// Server-clock "now", ticking every second; skew is serverMs - clientMs measured when data arrives.
export function useNow(skewMs: number) {
  const [now, setNow] = useState(() => Date.now() + skewMs)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + skewMs), 1000)
    return () => clearInterval(id)
  }, [skewMs])
  return now
}

// Returns 'up' or 'down' for 700ms after the value changes.
export function useFlash(value: number | null | undefined) {
  const prev = useRef(value)
  const [dir, setDir] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    const before = prev.current
    prev.current = value
    if (value == null || before == null || value === before) return
    setDir(value > before ? 'up' : 'down')
    const t = setTimeout(() => setDir(null), 700)
    return () => clearTimeout(t)
  }, [value])

  return dir
}
