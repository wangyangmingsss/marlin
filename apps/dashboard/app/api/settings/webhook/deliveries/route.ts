import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { apiList, apiError, parsePagination } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const { searchParams } = request.nextUrl
    const { limit, cursor } = parsePagination(searchParams)

    const where: any = { merchantId: session.merchantId }
    if (cursor) where.id = { lt: cursor }

    const deliveries = await prisma.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    return apiList(deliveries, limit)
  } catch (err) {
    console.error('Webhook deliveries error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
