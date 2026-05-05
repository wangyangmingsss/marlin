import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { loginSchema } from '@/lib/schemas'
import { signJwt, setSessionCookie } from '@/lib/auth'
import { createApiError } from '@marlin/shared'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(createApiError('VALIDATION_ERROR', { issues: parsed.error.issues }), { status: 400 })
    }

    const { address, signature, nonce } = parsed.data

    // Verify nonce exists and is not expired/used
    const authNonce = await prisma.authNonce.findUnique({ where: { nonce } })
    if (!authNonce) {
      return NextResponse.json(createApiError('UNAUTHORIZED', { reason: 'Invalid nonce' }), { status: 401 })
    }
    if (authNonce.wallet !== address) {
      return NextResponse.json(createApiError('UNAUTHORIZED', { reason: 'Nonce wallet mismatch' }), { status: 401 })
    }
    if (authNonce.usedAt) {
      return NextResponse.json(createApiError('UNAUTHORIZED', { reason: 'Nonce already used' }), { status: 401 })
    }
    if (authNonce.expiresAt < new Date()) {
      return NextResponse.json(createApiError('UNAUTHORIZED', { reason: 'Nonce expired' }), { status: 401 })
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

    // tweetnacl detached verify - message prefix matching
    // We verify the full stored message but only need nonce line to match
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
    if (!isValid) {
      return NextResponse.json(createApiError('UNAUTHORIZED', { reason: 'Invalid signature' }), { status: 401 })
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

    return NextResponse.json({ merchantId: merchant.id, isNew })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
