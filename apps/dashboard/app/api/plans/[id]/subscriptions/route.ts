import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiError } from '@marlin/shared'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: params.id, merchantId: session.merchantId },
    })

    if (!plan) {
      return NextResponse.json(createApiError('NOT_FOUND'), { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100)
    const cursor = searchParams.get('cursor')

    const subscriptions = await prisma.subscription.findMany({
      where: {
        planId: params.id,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        customer: {
          select: { id: true, walletAddress: true, email: true, label: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = subscriptions.length > limit
    const data = hasMore ? subscriptions.slice(0, limit) : subscriptions
    const nextCursor = hasMore ? data[data.length - 1].id : null

    return NextResponse.json({
      data,
      pagination: { nextCursor, hasMore },
    })
  } catch (err) {
    console.error('Plan subscriptions error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
