import { NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiError } from '@marlin/shared'

export async function GET() {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const merchantId = session.merchantId

    // Revenue from paid invoices grouped by mint
    const invoicesByMint = await prisma.invoice.groupBy({
      by: ['mint'],
      where: { merchantId, status: 'Paid' },
      _sum: { amount: true },
      _count: true,
    })

    // Revenue from confirmed charges grouped by mint (via plan)
    const chargesByMint = await prisma.charge.findMany({
      where: {
        status: 'Confirmed',
        subscription: { plan: { merchantId } },
      },
      select: {
        amount: true,
        subscription: { select: { plan: { select: { mint: true } } } },
      },
    })

    // Merge into a single map
    const mintMap = new Map<string, { total: bigint; count: number }>()

    for (const row of invoicesByMint) {
      mintMap.set(row.mint, {
        total: row._sum.amount ?? 0n,
        count: row._count,
      })
    }

    for (const ch of chargesByMint) {
      const mint = ch.subscription.plan.mint
      const existing = mintMap.get(mint) ?? { total: 0n, count: 0 }
      mintMap.set(mint, {
        total: existing.total + ch.amount,
        count: existing.count + 1,
      })
    }

    const data = Array.from(mintMap.entries()).map(([mint, { total, count }]) => ({
      mint,
      total: total.toString(),
      count,
    }))

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Analytics by-mint error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
