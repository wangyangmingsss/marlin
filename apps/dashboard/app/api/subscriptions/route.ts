import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { apiSuccess, apiList, apiError, parsePagination } from '@/lib/api-response'
import { z } from 'zod'

const createSubscriptionSchema = z.object({
  planId: z.string().min(1),
  customerWallet: z.string().min(32).max(44),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const { limit, cursor } = parsePagination(searchParams)

    const where: any = { plan: { merchantId: session.merchantId } }
    if (status) where.status = status
    if (cursor) where.id = { lt: cursor }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        plan: { select: { id: true, label: true, amount: true, mint: true, intervalSeconds: true } },
        customer: { select: { id: true, walletAddress: true, label: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    const serialized = subscriptions.map((s) => ({
      ...s,
      plan: { ...s.plan, amount: s.plan.amount.toString() },
    }))

    return apiList(serialized, limit)
  } catch (err) {
    console.error('Subscriptions list error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}

/**
 * POST /api/subscriptions
 * Creates a subscription for a customer to a plan (merchant-initiated).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const body = await request.json()
    const parsed = createSubscriptionSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues })
    }

    const { planId, customerWallet } = parsed.data

    // Verify the plan belongs to this merchant
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: planId, merchantId: session.merchantId },
    })
    if (!plan) {
      return apiError('NOT_FOUND', 'Plan not found', 404)
    }

    // Find or create the customer
    let customer = await prisma.customer.findFirst({
      where: { walletAddress: customerWallet, merchantId: session.merchantId },
    })
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          walletAddress: customerWallet,
          merchantId: session.merchantId,
        },
      })
    }

    // Create the subscription record
    const subscription = await prisma.subscription.create({
      data: {
        planId: plan.id,
        customerId: customer.id,
        status: 'Active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + plan.intervalSeconds * 1000),
      },
      include: {
        plan: { select: { id: true, label: true, amount: true, mint: true, intervalSeconds: true } },
        customer: { select: { id: true, walletAddress: true, label: true } },
      },
    })

    return apiSuccess({
      ...subscription,
      plan: { ...subscription.plan, amount: subscription.plan.amount.toString() },
    }, 201)
  } catch (err) {
    console.error('Subscription create error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
