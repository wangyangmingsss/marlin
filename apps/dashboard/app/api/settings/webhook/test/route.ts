import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const body = await request.json().catch(() => ({}))
    const eventType = body.eventType ?? 'test.ping'

    const delivery = await prisma.webhookDelivery.create({
      data: {
        merchantId: session.merchantId,
        eventType,
        payload: {
          type: eventType,
          data: { message: 'This is a test webhook delivery' },
          createdAt: new Date().toISOString(),
        },
        httpStatus: null,
        attempts: 0,
      },
    })

    return apiSuccess({ delivery })
  } catch (err) {
    console.error('Webhook test error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
