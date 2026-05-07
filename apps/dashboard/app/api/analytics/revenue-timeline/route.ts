import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

const RANGE_MS: Record<string, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const merchantId = session.merchantId
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') ?? '30d'

    const rangeMs = RANGE_MS[range]
    const since = rangeMs ? new Date(Date.now() - rangeMs) : undefined

    // Paid invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        merchantId,
        status: 'Paid',
        ...(since ? { paidAt: { gte: since } } : {}),
      },
      select: { paidAt: true, amount: true },
      orderBy: { paidAt: 'asc' },
    })

    // Confirmed charges from merchant's subscriptions
    const charges = await prisma.charge.findMany({
      where: {
        status: 'Confirmed',
        subscription: { plan: { merchantId } },
        ...(since ? { confirmedAt: { gte: since } } : {}),
      },
      select: { confirmedAt: true, amount: true },
      orderBy: { confirmedAt: 'asc' },
    })

    // Build day map
    const dayMap = new Map<string, bigint>()

    if (rangeMs) {
      const days = Math.ceil(rangeMs / (24 * 60 * 60 * 1000))
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        dayMap.set(d.toISOString().slice(0, 10), 0n)
      }
    }

    for (const inv of invoices) {
      if (inv.paidAt) {
        const key = inv.paidAt.toISOString().slice(0, 10)
        dayMap.set(key, (dayMap.get(key) ?? 0n) + inv.amount)
      }
    }

    for (const ch of charges) {
      if (ch.confirmedAt) {
        const key = ch.confirmedAt.toISOString().slice(0, 10)
        dayMap.set(key, (dayMap.get(key) ?? 0n) + ch.amount)
      }
    }

    const data = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount: amount.toString() }))

    return apiSuccess(data)
  } catch (err) {
    console.error('Revenue timeline error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
