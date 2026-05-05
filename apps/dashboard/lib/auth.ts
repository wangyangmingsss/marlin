import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'marlin-dev-secret-change-in-production',
)
const COOKIE_NAME = 'marlin-session'
const EXPIRY = '7d'

export interface MarlinJwtPayload extends JWTPayload {
  merchantId: string
  wallet: string
}

export async function signJwt(payload: { merchantId: string; wallet: string }): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(JWT_SECRET)
}

export async function verifyJwt(token: string): Promise<MarlinJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as MarlinJwtPayload
  } catch {
    return null
  }
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME)
}

export function getSessionToken(): string | undefined {
  return cookies().get(COOKIE_NAME)?.value
}

export async function getCurrentMerchant(): Promise<MarlinJwtPayload | null> {
  const token = getSessionToken()
  if (!token) return null
  return verifyJwt(token)
}
