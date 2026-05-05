import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createCustomerSchema } from '@/lib/schemas'
import { createApiError } from '@marlin/shared'

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')

    const where: any = { merchantId: session.merchantId }
    if (search) {
      where.OR = [
        { walletAddress: { contains: search } },
        { label: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: { select: { invoices: true, subscriptions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(customers)
  } catch (err) {
    console.error('Customers list error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()
    const parsed = createCustomerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(createApiError('VALIDATION_ERROR', { issues: parsed.error.issues }), { status: 400 })
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

    return NextResponse.json(customer, { status: 201 })
  } catch (err) {
    console.error('Customer create error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
