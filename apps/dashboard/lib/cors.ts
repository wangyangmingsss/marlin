import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Allowed origins for public API routes.
 * In development, localhost origins are permitted.
 */
const ALLOWED_ORIGINS: string[] = [
  'https://checkout.marlin.fi',
  'https://widget.marlin.fi',
]

const DEV_ORIGINS: string[] = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
]

function getAllowedOrigins(): string[] {
  if (process.env.NODE_ENV === 'development') {
    return [...ALLOWED_ORIGINS, ...DEV_ORIGINS]
  }
  return ALLOWED_ORIGINS
}

/**
 * Check whether the given origin is permitted for CORS.
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  return getAllowedOrigins().includes(origin)
}

/**
 * Apply CORS headers to a response for public API routes.
 * Returns a new NextResponse with appropriate headers set.
 */
export function withCors(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const origin = request.headers.get('origin')

  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
    response.headers.set('Access-Control-Max-Age', '86400')
  }

  return response
}

/**
 * Handle a CORS preflight (OPTIONS) request.
 * Returns a 204 response with the appropriate CORS headers if the origin is allowed.
 */
export function handlePreflight(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin')

  if (origin && isOriginAllowed(origin)) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  return new NextResponse(null, { status: 403 })
}
