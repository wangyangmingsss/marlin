import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { updatePlanSchema } from '@/lib/schemas'
import { createApiError } from '@marlin/shared'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
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
      return NextResponse.json(createApiError('NOT_FOUND'), { status: 404 })
    }

    const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/public/plan/${plan.onchainId}`

    return NextResponse.json({
      ...plan,
      amount: plan.amount.toString(),
      subscriptions: plan.subscriptions.map((s) => ({ ...s })),
      checkoutUrl,
    })
  } catch (err) {
    console.error('Plan detail error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()
    const parsed = updatePlanSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(createApiError('VALIDATION_ERROR', { issues: parsed.error.issues }), { status: 400 })
    }

    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: params.id, merchantId: session.merchantId },
    })

    if (!plan) {
      return NextResponse.json(createApiError('NOT_FOUND'), { status: 404 })
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id: params.id },
      data: parsed.data,
    })

    return NextResponse.json({ ...updated, amount: updated.amount.toString() })
  } catch (err) {
    console.error('Plan update error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
