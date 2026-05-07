import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { randomBytes } from 'crypto'
import { nonceQuerySchema } from '@/lib/schemas'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const parsed = nonceQuerySchema.safeParse({ address: searchParams.get('address') })
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid address parameter', 400, { issues: parsed.error.issues })
    }

    const { address } = parsed.data
    const nonce = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await prisma.authNonce.create({
      data: { nonce, wallet: address, expiresAt },
    })

    const message = [
      'Marlin wants you to sign in with your Solana account:',
      address,
      '',
      'Sign in to Marlin Dashboard',
      '',
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
      `Expiration Time: ${expiresAt.toISOString()}`,
    ].join('\n')

    return apiSuccess({ nonce, message })
  } catch (err) {
    console.error('Nonce error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
