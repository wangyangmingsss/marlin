import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { updateMerchantSchema } from '@/lib/schemas'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const body = await request.json()
    const parsed = updateMerchantSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues })
    }

    const merchant = await prisma.merchant.update({
      where: { id: session.merchantId },
      data: parsed.data,
    })

    return apiSuccess(merchant)
  } catch (err) {
    console.error('Merchant update error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
