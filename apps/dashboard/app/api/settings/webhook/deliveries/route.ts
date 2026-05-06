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

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100)

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { merchantId: session.merchantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ data: deliveries })
  } catch (err) {
    console.error('Webhook deliveries error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
