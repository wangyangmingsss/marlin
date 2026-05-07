import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET() {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const merchantId = session.merchantId

    // Total revenue from paid invoices
    const paidInvoices = await prisma.invoice.aggregate({
      where: { merchantId, status: 'Paid' },
      _sum: { amount: true },
      _count: true,
    })

    // Open invoices count
    const openInvoices = await prisma.invoice.count({
      where: { merchantId, status: 'Open' },
    })

    // Active subscriptions
    const activeSubscriptions = await prisma.subscription.count({
      where: { plan: { merchantId }, status: 'Active' },
    })

    // MRR from active subscriptions
    const activePlans = await prisma.subscription.findMany({
      where: { plan: { merchantId }, status: 'Active' },
      include: { plan: { select: { amount: true, intervalSeconds: true } } },
    })

    let mrr = 0
    for (const sub of activePlans) {
      const monthlyAmount = Number(sub.plan.amount) * (2592000 / sub.plan.intervalSeconds)
      mrr += monthlyAmount / 1_000_000 // Convert from smallest unit to dollars
    }

    const totalRevenue = Number(paidInvoices._sum.amount ?? 0n) / 1_000_000

    // Revenue chart - last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const paidInvoicesByDay = await prisma.invoice.findMany({
      where: { merchantId, status: 'Paid', paidAt: { gte: thirtyDaysAgo } },
      select: { paidAt: true, amount: true },
      orderBy: { paidAt: 'asc' },
    })

    const chartMap = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      chartMap.set(d.toISOString().slice(0, 10), 0)
    }
    for (const inv of paidInvoicesByDay) {
      if (inv.paidAt) {
        const key = inv.paidAt.toISOString().slice(0, 10)
        chartMap.set(key, (chartMap.get(key) ?? 0) + Number(inv.amount) / 1_000_000)
      }
    }

    const revenueChart = Array.from(chartMap.entries()).map(([date, revenue]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.round(revenue * 100) / 100,
    }))

    // Recent activity
    const recentInvoices = await prisma.invoice.findMany({
      where: { merchantId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: { customer: { select: { label: true, walletAddress: true } } },
    })

    const recentActivity = recentInvoices.map((inv) => ({
      id: inv.id,
      type: 'invoice',
      description: `Invoice ${inv.onchainId.slice(0, 8)}... ${inv.status === 'Paid' ? 'paid by' : 'sent to'} ${inv.customer?.label || inv.customer?.walletAddress.slice(0, 8) || 'customer'}`,
      amount: `$${(Number(inv.amount) / 1_000_000).toFixed(2)}`,
      status: inv.status,
      createdAt: inv.updatedAt.toISOString(),
    }))

    return apiSuccess({
      mrr: Math.round(mrr * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeSubscriptions,
      openInvoices,
      mrrTrend: 0,
      revenueTrend: 0,
      revenueChart,
      recentActivity,
    })
  } catch (err) {
    console.error('Analytics error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
