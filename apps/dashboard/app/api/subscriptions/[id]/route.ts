import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(
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
      include: {
        plan: { select: { id: true, label: true, amount: true, mint: true, intervalSeconds: true } },
        customer: { select: { id: true, walletAddress: true, label: true, email: true } },
        charges: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })

    if (!sub) {
      return apiError('NOT_FOUND', 'Subscription not found', 404)
    }

    return apiSuccess({
      ...sub,
      plan: { ...sub.plan, amount: sub.plan.amount.toString() },
      charges: sub.charges.map((c) => ({ ...c, amount: c.amount.toString() })),
    })
  } catch (err) {
    console.error('Subscription detail error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
