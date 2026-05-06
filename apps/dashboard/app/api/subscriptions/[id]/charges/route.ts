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

    const sub = await prisma.subscription.findFirst({
      where: { id: params.id, plan: { merchantId: session.merchantId } },
    })

    if (!sub) {
      return NextResponse.json(createApiError('NOT_FOUND'), { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100)
    const cursor = searchParams.get('cursor')

    const charges = await prisma.charge.findMany({
      where: { subscriptionId: params.id },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = charges.length > limit
    const data = hasMore ? charges.slice(0, limit) : charges
    const nextCursor = hasMore ? data[data.length - 1].id : null

    return NextResponse.json({
      data: data.map((c) => ({ ...c, amount: c.amount.toString() })),
      pagination: { nextCursor, hasMore },
    })
  } catch (err) {
    console.error('Subscription charges error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
