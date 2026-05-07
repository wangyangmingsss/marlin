import { getCurrentMerchant } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import crypto from 'crypto'

export async function POST() {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const secret = `whsec_${crypto.randomUUID()}`

    return apiSuccess({ secret })
  } catch (err) {
    console.error('Webhook rotate error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
