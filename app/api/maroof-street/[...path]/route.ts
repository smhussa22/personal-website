import { NextRequest, NextResponse } from 'next/server'

const EXCHANGE_URL = process.env.EXCHANGE_URL ?? 'http://localhost:8080'
const SYM = '(AAPL|TSLA|NVDA|MSFT|GOOGL)'
const GET_ALLOWED = new RegExp(
  `^(market|tape|status|account|traders|book/${SYM}|trades/${SYM}|order/${SYM}/\\d+)$`,
)

type Ctx = { params: Promise<{ path: string[] }> }

// The exchange being down is a normal state for the demo, so failures become a closed market, not a 500.
async function forward(path: string, init: RequestInit) {
  try {
    const res = await fetch(`${EXCHANGE_URL}/${path}`, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    const nextOpen = process.env.MARKET_NEXT_OPEN ?? null
    if (path.startsWith('status')) return NextResponse.json({ open: false, nextOpen })
    return NextResponse.json({ error: 'unreachable', nextOpen }, { status: 503 })
  }
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const path = (await params).path.join('/')
  if (!GET_ALLOWED.test(path)) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return forward(path + req.nextUrl.search, {})
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const path = (await params).path.join('/')
  if (path !== 'order') return NextResponse.json({ error: 'not found' }, { status: 404 })
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ accepted: false, reason: 'invalid_order' }, { status: 400 })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  return forward('order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-IP': ip,
      'X-Proxy-Secret': process.env.EXCHANGE_PROXY_SECRET ?? '',
    },
    body: JSON.stringify(body),
  })
}
