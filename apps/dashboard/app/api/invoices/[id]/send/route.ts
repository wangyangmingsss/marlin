import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiError } from '@marlin/shared'
import { z } from 'zod'

const sendInvoiceSchema = z.object({
  email: z.string().email(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()
    const parsed = sendInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(createApiError('VALIDATION_ERROR', { issues: parsed.error.issues }), { status: 400 })
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, merchantId: session.merchantId },
    })

    if (!invoice) {
      return NextResponse.json(createApiError('INVOICE_NOT_FOUND'), { status: 404 })
    }

    // Hackathon scope: log and return success (real Resend integration is stretch)
    console.log(`[invoice:send] Would send invoice ${invoice.id} to ${parsed.data.email}`)

    return NextResponse.json({ success: true, sentTo: parsed.data.email })
  } catch (err) {
    console.error('Invoice send error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
