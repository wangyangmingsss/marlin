import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiKeySchema } from '@/lib/schemas'
import { apiSuccess, apiError } from '@/lib/api-response'
import { randomBytes, createHash } from 'crypto'

export async function GET() {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const keys = await prisma.apiKey.findMany({
      where: { merchantId: session.merchantId, revokedAt: null },
      select: {
        id: true,
        label: true,
        keyHash: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(
      keys.map((k) => ({
        id: k.id,
        label: k.label,
        keyPrefix: k.keyHash.slice(0, 8),
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      })),
    )
  } catch (err) {
    console.error('API keys list error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const body = await request.json()
    const parsed = createApiKeySchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues })
    }

    // Generate API key
    const rawKey = `mlk_${randomBytes(32).toString('hex')}`
    const keyHash = createHash('sha256').update(rawKey).digest('hex')

    await prisma.apiKey.create({
      data: {
        merchantId: session.merchantId,
        keyHash,
        label: parsed.data.label,
      },
    })

    // Return the raw key - it will not be shown again
    return apiSuccess({ key: rawKey }, 201)
  } catch (err) {
    console.error('API key create error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
