import { NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiError } from '@marlin/shared'

export async function GET() {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: session.merchantId },
      select: {
        id: true,
        walletAddress: true,
        label: true,
        webhookUrl: true,
        createdAt: true,
      },
    })

    if (!merchant) {
      return NextResponse.json(createApiError('NOT_FOUND'), { status: 404 })
    }

    return NextResponse.json(merchant)
  } catch (err) {
    console.error('Me error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
