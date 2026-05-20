import { type NextRequest, NextResponse } from 'next/server'

// Target FastAPI backend. Override via BACKEND_URL env var for Docker / prod.
const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8000'

// Headers the browser sends that must NOT be forwarded to the backend
// (host is always regenerated; connection is hop-by-hop).
const BLOCKED_REQUEST_HEADERS = new Set(['host', 'connection', 'keep-alive', 'te', 'trailers', 'transfer-encoding', 'upgrade'])

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const qs = req.nextUrl.search
  const backendUrl = `${BACKEND}/api/${path.join('/')}${qs}`

  // Forward safe headers from the browser to the backend
  const forwardHeaders = new Headers()
  for (const [key, value] of req.headers.entries()) {
    if (!BLOCKED_REQUEST_HEADERS.has(key.toLowerCase())) {
      forwardHeaders.set(key, value)
    }
  }

  // Read body for mutating methods
  let body: ArrayBuffer | undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.arrayBuffer()
  }

  let res: Response
  try {
    res = await fetch(backendUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: body && body.byteLength > 0 ? body : undefined,
      // Disable Next.js fetch caching — all API responses must be live
      cache: 'no-store',
    })
  } catch (err) {
    console.error('[proxy] backend unreachable:', backendUrl, err)
    return NextResponse.json(
      { data: null, errors: [{ code: 'BACKEND_UNREACHABLE', message: 'Backend server is not running' }], meta: null },
      { status: 503 },
    )
  }

  // Pass the response stream straight through (works for JSON, SSE, file downloads)
  const responseHeaders = new Headers()
  for (const [key, value] of res.headers.entries()) {
    // Strip hop-by-hop headers that should not be forwarded
    if (!BLOCKED_REQUEST_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value)
    }
  }

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  })
}

export const GET     = proxy
export const POST    = proxy
export const PUT     = proxy
export const PATCH   = proxy
export const DELETE  = proxy
export const OPTIONS = proxy
