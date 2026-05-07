import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { formatBigIntAmount } from '@marlin/shared'
import { apiSuccess, apiError } from '@/lib/api-response'

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
      return apiError('NOT_FOUND', 'Plan not found', 404)
    }

    if (!plan.active) {
      return apiError('NOT_FOUND', 'Plan is no longer active', 404)
    }

    return apiSuccess({
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
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
