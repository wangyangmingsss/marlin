import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { updatePlanSchema } from '@/lib/schemas'
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

    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: params.id, merchantId: session.merchantId },
      include: {
        subscriptions: {
          include: { customer: { select: { walletAddress: true, label: true } } },
          take: 50,
        },
      },
    })

    if (!plan) {
      return apiError('NOT_FOUND', 'Plan not found', 404)
    }

    const checkoutUrl = `${process.env.NEXT_PUBLIC_CHECKOUT_URL || 'http://localhost:3001'}/sub/${plan.onchainId}`

    return apiSuccess({
      ...plan,
      amount: plan.amount.toString(),
      subscriptions: plan.subscriptions.map((s) => ({ ...s })),
      checkoutUrl,
    })
  } catch (err) {
    console.error('Plan detail error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const body = await request.json()
    const parsed = updatePlanSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues })
    }

    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: params.id, merchantId: session.merchantId },
    })

    if (!plan) {
      return apiError('NOT_FOUND', 'Plan not found', 404)
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id: params.id },
      data: parsed.data,
    })

    return apiSuccess({ ...updated, amount: updated.amount.toString() })
  } catch (err) {
    console.error('Plan update error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
