import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiError } from '@marlin/shared'
import { z } from 'zod'

const createSubscriptionSchema = z.object({
  planId: z.string().min(1),
  customerWallet: z.string().min(32).max(44),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')

    const where: any = { plan: { merchantId: session.merchantId } }
    if (status) where.status = status

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        plan: { select: { id: true, label: true, amount: true, mint: true, intervalSeconds: true } },
        customer: { select: { id: true, walletAddress: true, label: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(
      subscriptions.map((s) => ({
        ...s,
        plan: { ...s.plan, amount: s.plan.amount.toString() },
      })),
    )
  } catch (err) {
    console.error('Subscriptions list error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
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
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()
    const parsed = createSubscriptionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        createApiError('VALIDATION_ERROR', { issues: parsed.error.issues }),
        { status: 400 },
      )
    }

    const { planId, customerWallet } = parsed.data

    // Verify the plan belongs to this merchant
    const plan = await prisma.plan.findFirst({
      where: { id: planId, merchantId: session.merchantId },
    })
    if (!plan) {
      return NextResponse.json(createApiError('NOT_FOUND', { message: 'Plan not found' }), { status: 404 })
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

    return NextResponse.json(
      {
        subscription: {
          ...subscription,
          plan: { ...subscription.plan, amount: subscription.plan.amount.toString() },
        },
      },
      { status: 201 },
    )
  } catch (err) {
    console.error('Subscription create error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
