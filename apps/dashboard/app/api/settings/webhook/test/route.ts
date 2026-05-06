import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiError } from '@marlin/shared'

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
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

    return NextResponse.json({ delivery })
  } catch (err) {
    console.error('Webhook test error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
