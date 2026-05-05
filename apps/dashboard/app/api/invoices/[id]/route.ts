import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiError } from '@marlin/shared'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, merchantId: session.merchantId },
      include: {
        customer: { select: { id: true, walletAddress: true, label: true, email: true } },
      },
    })

    if (!invoice) {
      return NextResponse.json(createApiError('INVOICE_NOT_FOUND'), { status: 404 })
    }

    const hostedCheckoutUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/public/invoice/${invoice.onchainId}`

    return NextResponse.json({
      ...invoice,
      amount: invoice.amount.toString(),
      hostedCheckoutUrl,
    })
  } catch (err) {
    console.error('Invoice detail error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, merchantId: session.merchantId },
    })

    if (!invoice) {
      return NextResponse.json(createApiError('INVOICE_NOT_FOUND'), { status: 404 })
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: { memo: body.memo },
    })

    return NextResponse.json({ ...updated, amount: updated.amount.toString() })
  } catch (err) {
    console.error('Invoice update error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
