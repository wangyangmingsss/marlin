import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function POST(
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
    })

    if (!invoice) {
      return apiError('INVOICE_NOT_FOUND', 'Invoice not found', 404)
    }

    if (invoice.status !== 'Open') {
      return apiError('INVOICE_NOT_OPEN', 'Invoice is not in Open status', 400)
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: { status: 'Void' },
    })

    return apiSuccess({ ...updated, amount: updated.amount.toString() })
  } catch (err) {
    console.error('Invoice void error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
