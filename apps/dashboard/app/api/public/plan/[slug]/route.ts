import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { createApiError, formatBigIntAmount } from '@marlin/shared'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { onchainId: params.slug },
      include: {
        merchant: { select: { label: true, walletAddress: true } },
      },
    })

    if (!plan) {
      return NextResponse.json(createApiError('NOT_FOUND'), { status: 404 })
    }

    if (!plan.active) {
      return NextResponse.json(createApiError('NOT_FOUND', { reason: 'Plan is no longer active' }), { status: 404 })
    }

    return NextResponse.json({
      onchainId: plan.onchainId,
      merchant: plan.merchant,
      label: plan.label,
      description: plan.description,
      amount: plan.amount.toString(),
      amountFormatted: formatBigIntAmount(plan.amount, 6),
      mint: plan.mint,
      intervalSeconds: plan.intervalSeconds,
    })
  } catch (err) {
    console.error('Public plan error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
