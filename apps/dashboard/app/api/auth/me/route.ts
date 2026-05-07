import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET() {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: session.merchantId },
      select: {
        id: true,
        walletAddress: true,
        label: true,
        webhookUrl: true,
        createdAt: true,
      },
    })

    if (!merchant) {
      return apiError('NOT_FOUND', 'Merchant not found', 404)
    }

    return apiSuccess(merchant)
  } catch (err) {
    console.error('Me error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
