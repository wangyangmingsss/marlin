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

    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: params.id, merchantId: session.merchantId },
    })

    if (!plan) {
      return apiError('NOT_FOUND', 'Plan not found', 404)
    }

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const { limit, cursor } = parsePagination(searchParams)

    const where: any = { planId: params.id }
    if (status) where.status = status
    if (cursor) where.id = { lt: cursor }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        customer: {
          select: { id: true, walletAddress: true, email: true, label: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    return apiList(subscriptions, limit)
  } catch (err) {
    console.error('Plan subscriptions error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
