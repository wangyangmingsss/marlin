import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiError } from '@marlin/shared'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const sub = await prisma.subscription.findFirst({
      where: { id: params.id, plan: { merchantId: session.merchantId } },
    })

    if (!sub) {
      return NextResponse.json(createApiError('NOT_FOUND'), { status: 404 })
    }

    if (sub.status !== 'PastDue') {
      return NextResponse.json(
        createApiError('VALIDATION_ERROR', { reason: 'Subscription is not paused' }),
        { status: 400 },
      )
    }

    const updated = await prisma.subscription.update({
      where: { id: params.id },
      data: { status: 'Active' },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Subscription resume error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
