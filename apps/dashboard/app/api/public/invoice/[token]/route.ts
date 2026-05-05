import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { createApiError, formatBigIntAmount } from '@marlin/shared'

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
      return NextResponse.json(createApiError('INVOICE_NOT_FOUND'), { status: 404 })
    }

    // Record view
    await prisma.invoiceView.create({
      data: {
        invoiceId: invoice.id,
        viewerIp: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    }).catch(() => {}) // non-critical

    return NextResponse.json({
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
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
