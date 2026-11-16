import { NextRequest, NextResponse } from 'next/server'
import { replayGet, replayOrder } from '@/lib/maroof-street-replay'

const EXCHANGE_URL = process.env.EXCHANGE_URL ?? 'http://localhost:8080'
const SYM = '(AAPL|TSLA|NVDA|MSFT|GOOGL)'
const GET_ALLOWED = new RegExp(
  `^(market|tape|status|account|traders|book/${SYM}|trades/${SYM}|order/${SYM}/\\d+)$`,
)

const COOKIE = 'ms_vid'

// An anonymous visitor id so each person gets their own wallet; a new browser or a cleared cookie starts fresh.
function visitorOf(req: NextRequest) {
  const existing = req.cookies.get(COOKIE)?.value
  const valid = existing && /^[0-9a-f-]{36}$/.test(existing)
  return { id: valid ? existing : crypto.randomUUID(), isNew: !valid }
}

function withCookie(res: NextResponse, v: { id: string; isNew: boolean }) {
  if (v.isNew) {
    res.cookies.set(COOKIE, v.id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 })
  }
  return res
}

type Ctx = { params: Promise<{ path: string[] }> }

// The exchange being down is a normal state for the demo, so failures become a closed market, not a 500.
async function forward(path: string, init: RequestInit, ip = 'unknown', visitor = '') {
  try {
    // the visitor id lets the exchange keep each person's wallet and orders apart
    const res = await fetch(`${EXCHANGE_URL}/${path}`, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), 'X-Visitor-Id': visitor },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch {
    // no exchange: play back a recorded session if there is one, otherwise show the market as closed
    const [route, search = ''] = path.split('?')
    if (init.method === 'POST') {
      const sim = await replayOrder(JSON.parse(String(init.body)), ip, visitor)
      if (sim) return NextResponse.json(sim)
    } else {
      const replay = await replayGet(route, search ? `?${search}` : '', visitor)
      if (replay) return NextResponse.json(replay)
    }
    const nextOpen = process.env.MARKET_NEXT_OPEN ?? null
    if (path.startsWith('status')) return NextResponse.json({ open: false, nextOpen })
    return NextResponse.json({ error: 'unreachable', nextOpen }, { status: 503 })
  }
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const path = (await params).path.join('/')
  if (!GET_ALLOWED.test(path)) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const v = visitorOf(req)
  return withCookie(await forward(path + req.nextUrl.search, {}, 'unknown', v.id), v)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const path = (await params).path.join('/')
  if (path !== 'order') return NextResponse.json({ error: 'not found' }, { status: 404 })
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ accepted: false, reason: 'invalid_order' }, { status: 400 })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const v = visitorOf(req)
  return withCookie(await forward('order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-IP': ip,
      'X-Proxy-Secret': process.env.EXCHANGE_PROXY_SECRET ?? '',
    },
    body: JSON.stringify(body),
  }, ip, v.id), v)
}
