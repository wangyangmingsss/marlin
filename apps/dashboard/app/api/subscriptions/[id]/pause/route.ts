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

    if (sub.status !== 'Active') {
      return NextResponse.json(
        createApiError('VALIDATION_ERROR', { reason: 'Subscription is not active' }),
        { status: 400 },
      )
    }

    const updated = await prisma.subscription.update({
      where: { id: params.id },
      data: { status: 'PastDue' }, // PastDue acts as paused state
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Subscription pause error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
