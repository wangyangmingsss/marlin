import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
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

    const sub = await prisma.subscription.findFirst({
      where: { id: params.id, plan: { merchantId: session.merchantId } },
      include: {
        plan: { select: { id: true, label: true, amount: true, mint: true, intervalSeconds: true } },
        customer: { select: { id: true, walletAddress: true, label: true, email: true } },
        charges: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })

    if (!sub) {
      return NextResponse.json(createApiError('NOT_FOUND'), { status: 404 })
    }

    return NextResponse.json({
      ...sub,
      plan: { ...sub.plan, amount: sub.plan.amount.toString() },
      charges: sub.charges.map((c) => ({ ...c, amount: c.amount.toString() })),
    })
  } catch (err) {
    console.error('Subscription detail error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
