import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { updateMerchantSchema } from '@/lib/schemas'
import { createApiError } from '@marlin/shared'

export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()
    const parsed = updateMerchantSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(createApiError('VALIDATION_ERROR', { issues: parsed.error.issues }), { status: 400 })
    }

    const merchant = await prisma.merchant.update({
      where: { id: session.merchantId },
      data: parsed.data,
    })

    return NextResponse.json(merchant)
  } catch (err) {
    console.error('Merchant update error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
