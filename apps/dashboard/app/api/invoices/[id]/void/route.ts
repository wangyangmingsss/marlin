import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiError } from '@marlin/shared'

export async function POST(
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
    })

    if (!invoice) {
      return NextResponse.json(createApiError('INVOICE_NOT_FOUND'), { status: 404 })
    }

    if (invoice.status !== 'Open') {
      return NextResponse.json(createApiError('INVOICE_NOT_OPEN'), { status: 400 })
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: { status: 'Cancelled' },
    })

    return NextResponse.json({ ...updated, amount: updated.amount.toString() })
  } catch (err) {
    console.error('Invoice void error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
