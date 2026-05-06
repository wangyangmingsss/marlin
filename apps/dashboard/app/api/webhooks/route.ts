import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiError } from '@marlin/shared'
import { z } from 'zod'

const registerWebhookSchema = z.object({
  url: z.string().url().startsWith('https://', { message: 'Webhook URL must use HTTPS' }),
})

/**
 * POST /api/webhooks
 * Convenience endpoint to register/update webhook URL.
 * Equivalent to PUT /api/settings/webhook.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()
    const parsed = registerWebhookSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        createApiError('VALIDATION_ERROR', { issues: parsed.error.issues }),
        { status: 400 },
      )
    }

    await prisma.merchant.update({
      where: { id: session.merchantId },
      data: { webhookUrl: parsed.data.url },
    })

    return NextResponse.json({ webhookUrl: parsed.data.url })
  } catch (err) {
    console.error('Webhook register error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
