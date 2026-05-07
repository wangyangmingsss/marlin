import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { formatBigIntAmount } from '@marlin/shared'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { onchainId: params.token },
      include: {
        merchant: { select: { label: true, walletAddress: true } },
        customer: { select: { walletAddress: true, label: true } },
      },
    })

    if (!invoice) {
      return apiError('INVOICE_NOT_FOUND', 'Invoice not found', 404)
    }

    // Record view
    await prisma.invoiceView.create({
      data: {
        invoiceId: invoice.id,
        viewerIp: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    }).catch(() => {}) // non-critical

    return apiSuccess({
      onchainId: invoice.onchainId,
      merchant: invoice.merchant,
      amount: invoice.amount.toString(),
      amountFormatted: formatBigIntAmount(invoice.amount, 6),
      mint: invoice.mint,
      status: invoice.status,
      memo: invoice.memo,
      expiresAt: invoice.expiresAt?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
    })
  } catch (err) {
    console.error('Public invoice error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
