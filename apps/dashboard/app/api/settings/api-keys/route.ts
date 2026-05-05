import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiKeySchema } from '@/lib/schemas'
import { createApiError } from '@marlin/shared'
import { randomBytes, createHash } from 'crypto'

export async function GET() {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
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

    return NextResponse.json(
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
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()
    const parsed = createApiKeySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(createApiError('VALIDATION_ERROR', { issues: parsed.error.issues }), { status: 400 })
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
    return NextResponse.json({ key: rawKey }, { status: 201 })
  } catch (err) {
    console.error('API key create error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
