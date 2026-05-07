import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { apiList, apiError, parsePagination } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
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

    const { searchParams } = request.nextUrl
    const { limit, cursor } = parsePagination(searchParams)

    const where: any = { subscriptionId: params.id }
    if (cursor) where.id = { lt: cursor }

    const charges = await prisma.charge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    const serialized = charges.map((c) => ({ ...c, amount: c.amount.toString() }))
    return apiList(serialized, limit)
  } catch (err) {
    console.error('Subscription charges error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
