import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiError } from '@marlin/shared'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const key = await prisma.apiKey.findFirst({
      where: { id: params.id, merchantId: session.merchantId, revokedAt: null },
    })

    if (!key) {
      return NextResponse.json(createApiError('NOT_FOUND'), { status: 404 })
    }

    await prisma.apiKey.update({
      where: { id: params.id },
      data: { revokedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('API key revoke error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
