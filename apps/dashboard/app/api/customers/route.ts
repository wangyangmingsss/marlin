import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createCustomerSchema } from '@/lib/schemas'
import { apiSuccess, apiList, apiError, parsePagination } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')
    const { limit, cursor } = parsePagination(searchParams)

    const where: any = { merchantId: session.merchantId }
    if (search) {
      where.OR = [
        { walletAddress: { contains: search } },
        { label: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (cursor) {
      where.id = { lt: cursor }
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: { select: { invoices: true, subscriptions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    return apiList(customers, limit)
  } catch (err) {
    console.error('Customers list error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const body = await request.json()
    const parsed = createCustomerSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues })
    }

    const customer = await prisma.customer.upsert({
      where: {
        walletAddress_merchantId: {
          walletAddress: parsed.data.walletAddress,
          merchantId: session.merchantId,
        },
      },
      update: {
        ...(parsed.data.email && { email: parsed.data.email }),
        ...(parsed.data.label && { label: parsed.data.label }),
      },
      create: {
        ...parsed.data,
        merchantId: session.merchantId,
      },
    })

    return apiSuccess(customer, 201)
  } catch (err) {
    console.error('Customer create error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
