import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'marlin-dev-secret-change-in-production',
)
const COOKIE_NAME = 'marlin-session'

const publicPaths = [
  '/api/auth/',
  '/api/public/',
  '/api/health',
  '/connect',
  '/onboarding',
  '/',
]

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths, static files, and Next internals
  if (
    isPublicPath(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check auth for dashboard and API routes
  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required', details: {} } },
        { status: 401 },
      )
    }
    return NextResponse.redirect(new URL('/connect', request.url))
  }

  try {
    await jwtVerify(token, JWT_SECRET)
    return NextResponse.next()
  } catch {
    // Invalid token
    const response = pathname.startsWith('/api/')
      ? NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Invalid session', details: {} } },
          { status: 401 },
        )
      : NextResponse.redirect(new URL('/connect', request.url))

    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
