import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { updateWebhookSchema } from '@/lib/schemas'
import { createApiError } from '@marlin/shared'

export async function GET() {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: session.merchantId },
      select: { webhookUrl: true },
    })

    return NextResponse.json({ webhookUrl: merchant?.webhookUrl ?? null })
  } catch (err) {
    console.error('Webhook get error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()
    const parsed = updateWebhookSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(createApiError('VALIDATION_ERROR', { issues: parsed.error.issues }), { status: 400 })
    }

    await prisma.merchant.update({
      where: { id: session.merchantId },
      data: { webhookUrl: parsed.data.webhookUrl },
    })

    return NextResponse.json({ webhookUrl: parsed.data.webhookUrl })
  } catch (err) {
    console.error('Webhook update error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
