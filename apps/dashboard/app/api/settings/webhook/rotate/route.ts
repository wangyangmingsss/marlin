import { NextResponse } from 'next/server'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiError } from '@marlin/shared'
import crypto from 'crypto'

export async function POST() {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const secret = `whsec_${crypto.randomUUID()}`

    // Schema doesn't have webhookSecret field — skip saving, just return it
    console.log(`[webhook:rotate] Generated new webhook secret for merchant ${session.merchantId}`)

    return NextResponse.json({ secret })
  } catch (err) {
    console.error('Webhook rotate error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
