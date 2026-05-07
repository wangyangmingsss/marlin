import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { updateCustomerSchema } from '@/lib/schemas'
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

    const customer = await prisma.customer.findFirst({
      where: { id: params.id, merchantId: session.merchantId },
      include: {
        invoices: {
          select: { id: true, onchainId: true, amount: true, mint: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        subscriptions: {
          include: { plan: { select: { label: true, amount: true, mint: true } } },
          take: 20,
        },
      },
    })

    if (!customer) {
      return apiError('NOT_FOUND', 'Customer not found', 404)
    }

    return apiSuccess({
      ...customer,
      invoices: customer.invoices.map((i) => ({ ...i, amount: i.amount.toString() })),
      subscriptions: customer.subscriptions.map((s) => ({
        ...s,
        plan: { ...s.plan, amount: s.plan.amount.toString() },
      })),
    })
  } catch (err) {
    console.error('Customer detail error:', err)
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
    const parsed = updateCustomerSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues })
    }

    const customer = await prisma.customer.findFirst({
      where: { id: params.id, merchantId: session.merchantId },
    })
    if (!customer) {
      return apiError('NOT_FOUND', 'Customer not found', 404)
    }

    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: parsed.data,
    })

    return apiSuccess(updated)
  } catch (err) {
    console.error('Customer update error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
