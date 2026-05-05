import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiError } from '@marlin/shared'

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')

    const where: any = { plan: { merchantId: session.merchantId } }
    if (status) where.status = status

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        plan: { select: { id: true, label: true, amount: true, mint: true, intervalSeconds: true } },
        customer: { select: { id: true, walletAddress: true, label: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(
      subscriptions.map((s) => ({
        ...s,
        plan: { ...s.plan, amount: s.plan.amount.toString() },
      })),
    )
  } catch (err) {
    console.error('Subscriptions list error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
