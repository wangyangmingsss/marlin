import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const key = await prisma.apiKey.findFirst({
      where: { id: params.id, merchantId: session.merchantId, revokedAt: null },
    })

    if (!key) {
      return apiError('NOT_FOUND', 'API key not found', 404)
    }

    await prisma.apiKey.update({
      where: { id: params.id },
      data: { revokedAt: new Date() },
    })

    return apiSuccess({ deleted: true })
  } catch (err) {
    console.error('API key revoke error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
