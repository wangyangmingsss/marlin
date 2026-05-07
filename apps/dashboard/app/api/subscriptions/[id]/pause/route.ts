import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const sub = await prisma.subscription.findFirst({
      where: { id: params.id, plan: { merchantId: session.merchantId } },
    })

    if (!sub) {
      return apiError('NOT_FOUND', 'Subscription not found', 404)
    }

    if (sub.status !== 'Active') {
      return apiError('VALIDATION_ERROR', 'Subscription is not active', 400)
    }

    const updated = await prisma.subscription.update({
      where: { id: params.id },
      data: { status: 'Paused' },
    })

    return apiSuccess(updated)
  } catch (err) {
    console.error('Subscription pause error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
