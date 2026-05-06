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
      include: { merchant: true },
    })

    if (!invoice) {
      return NextResponse.json(createApiError('INVOICE_NOT_FOUND'), { status: 404 })
    }

    const checkoutUrl = `${process.env.NEXT_PUBLIC_CHECKOUT_URL || 'https://checkout.marlin.fi'}/i/${invoice.onchainId}`
    const amountFormatted = (Number(invoice.amount) / 1_000_000).toFixed(2)
    const merchantName = invoice.merchant.label || 'Merchant'

    const resendApiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.EMAIL_FROM_INVOICES || 'invoices@marlin.fi'

    if (resendApiKey) {
      // Send email via Resend
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${merchantName} via Marlin <${fromEmail}>`,
          to: [parsed.data.email],
          subject: `Invoice from ${merchantName} — $${amountFormatted}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 24px; font-weight: 700; color: #111; margin: 0;">Invoice from ${merchantName}</h1>
              </div>
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 18px; color: #111;">$${amountFormatted}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Currency</td>
                    <td style="padding: 8px 0; text-align: right; color: #111; font-size: 14px;">${invoice.mint.slice(0, 4)}...${invoice.mint.slice(-4)}</td>
                  </tr>
                  ${invoice.memo ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Memo</td>
                    <td style="padding: 8px 0; text-align: right; color: #111; font-size: 14px;">${invoice.memo}</td>
                  </tr>
                  ` : ''}
                  ${invoice.expiresAt ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Due by</td>
                    <td style="padding: 8px 0; text-align: right; color: #111; font-size: 14px;">${invoice.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${checkoutUrl}" style="display: inline-block; background: #0066FF; color: #fff; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px; text-decoration: none;">Pay Invoice</a>
              </div>
              <p style="text-align: center; color: #9ca3af; font-size: 12px; margin: 0;">
                Powered by <a href="https://marlin.fi" style="color: #6b7280;">Marlin</a> — Stablecoin billing on Solana
              </p>
            </div>
          `,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error(`[invoice:send] Resend API error: ${response.status} ${errorBody}`)
        return NextResponse.json(createApiError('INTERNAL', { reason: 'Email delivery failed' }), { status: 500 })
      }

      const result = await response.json()
      console.log(`[invoice:send] Email sent to ${parsed.data.email}, Resend ID: ${result.id}`)
    } else {
      // Fallback: log when no RESEND_API_KEY configured
      console.log(`[invoice:send] RESEND_API_KEY not set. Would send invoice ${invoice.id} to ${parsed.data.email}`)
      console.log(`[invoice:send] Checkout URL: ${checkoutUrl}`)
    }

    return NextResponse.json({ success: true, sentTo: parsed.data.email })
  } catch (err) {
    console.error('Invoice send error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
