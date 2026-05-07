import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, merchantId: session.merchantId },
      include: {
        customer: { select: { id: true, walletAddress: true, label: true, email: true } },
      },
    })

    if (!invoice) {
      return apiError('INVOICE_NOT_FOUND', 'Invoice not found', 404)
    }

    const hostedCheckoutUrl = `${process.env.NEXT_PUBLIC_CHECKOUT_URL || 'http://localhost:3001'}/i/${invoice.onchainId}`

    return apiSuccess({
      ...invoice,
      amount: invoice.amount.toString(),
      hostedCheckoutUrl,
    })
  } catch (err) {
    console.error('Invoice detail error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const body = await request.json()

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, merchantId: session.merchantId },
    })

    if (!invoice) {
      return apiError('INVOICE_NOT_FOUND', 'Invoice not found', 404)
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: { memo: body.memo },
    })

    return apiSuccess({ ...updated, amount: updated.amount.toString() })
  } catch (err) {
    console.error('Invoice update error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
