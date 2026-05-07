import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { loginSchema } from '@/lib/schemas'
import { signJwt, setSessionCookie } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues })
    }

    const { address, signature, nonce } = parsed.data

    // Verify nonce exists and is not expired/used
    const authNonce = await prisma.authNonce.findUnique({ where: { nonce } })
    if (!authNonce) {
      return apiError('UNAUTHORIZED', 'Invalid nonce', 401)
    }
    if (authNonce.wallet !== address) {
      return apiError('UNAUTHORIZED', 'Nonce wallet mismatch', 401)
    }
    if (authNonce.usedAt) {
      return apiError('UNAUTHORIZED', 'Nonce already used', 401)
    }
    if (authNonce.expiresAt < new Date()) {
      return apiError('UNAUTHORIZED', 'Nonce expired', 401)
    }

    // Rebuild the message to verify
    const message = [
      'Marlin wants you to sign in with your Solana account:',
      address,
      '',
      'Sign in to Marlin Dashboard',
      '',
      `Nonce: ${nonce}`,
    ].join('\n')

    // Verify signature
    const publicKeyBytes = bs58.decode(address)
    const signatureBytes = bs58.decode(signature)
    const messageBytes = new TextEncoder().encode(message)

    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
    if (!isValid) {
      return apiError('UNAUTHORIZED', 'Invalid signature', 401)
    }

    // Mark nonce as used
    await prisma.authNonce.update({
      where: { nonce },
      data: { usedAt: new Date() },
    })

    // Find or create merchant
    let merchant = await prisma.merchant.findUnique({ where: { walletAddress: address } })
    let isNew = false

    if (!merchant) {
      merchant = await prisma.merchant.create({
        data: { walletAddress: address },
      })
      isNew = true
    }

    // Issue JWT
    const token = await signJwt({ merchantId: merchant.id, wallet: address })
    setSessionCookie(token)

    return apiSuccess({ merchantId: merchant.id, isNew })
  } catch (err) {
    console.error('Login error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
