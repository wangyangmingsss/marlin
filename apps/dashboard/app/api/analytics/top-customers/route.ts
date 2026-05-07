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

    const customers = await prisma.customer.findMany({
      where: { merchantId },
      include: {
        invoices: {
          where: { status: 'Paid' },
          select: { amount: true },
        },
        subscriptions: {
          select: {
            id: true,
            charges: {
              where: { status: 'Confirmed' },
              select: { amount: true },
            },
          },
        },
      },
    })

    const ranked = customers.map((c) => {
      let totalSpent = 0n
      let invoiceCount = 0
      let subscriptionCount = c.subscriptions.length

      for (const inv of c.invoices) {
        totalSpent += inv.amount
        invoiceCount++
      }

      for (const sub of c.subscriptions) {
        for (const ch of sub.charges) {
          totalSpent += ch.amount
        }
      }

      return {
        customer: {
          id: c.id,
          walletAddress: c.walletAddress,
          email: c.email,
          label: c.label,
        },
        totalSpent: totalSpent.toString(),
        invoiceCount,
        subscriptionCount,
      }
    })

    ranked.sort((a, b) => {
      const diff = BigInt(b.totalSpent) - BigInt(a.totalSpent)
      return diff > 0n ? 1 : diff < 0n ? -1 : 0
    })

    return apiSuccess(ranked.slice(0, 10))
  } catch (err) {
    console.error('Top customers error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
