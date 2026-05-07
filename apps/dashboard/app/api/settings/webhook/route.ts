import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { updateWebhookSchema } from '@/lib/schemas'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET() {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: session.merchantId },
      select: { webhookUrl: true },
    })

    return apiSuccess({ webhookUrl: merchant?.webhookUrl ?? null })
  } catch (err) {
    console.error('Webhook get error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const body = await request.json()
    const parsed = updateWebhookSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues })
    }

    await prisma.merchant.update({
      where: { id: session.merchantId },
      data: { webhookUrl: parsed.data.webhookUrl },
    })

    return apiSuccess({ webhookUrl: parsed.data.webhookUrl })
  } catch (err) {
    console.error('Webhook update error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
