import { NextRequest, NextResponse } from 'next/server'
import { getCurrentMerchant } from '@/lib/auth'
import { createApiError } from '@marlin/shared'
import { randomUUID } from 'node:crypto'

/**
 * POST /api/confidential-invoices/upload-blob
 *
 * Accepts an encrypted blob (EncryptedBlob JSON) and stores it,
 * returning a URL that can be stored on-chain (max 128 bytes).
 *
 * In production this would upload to Arweave/IPFS. For now we store
 * in a simple server-side store and serve via a short URL.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()

    // Validate the encrypted blob structure
    const { ciphertext, boxNonce, ephemeralPubkey, recipientPubkey } = body
    if (!ciphertext || !boxNonce || !ephemeralPubkey || !recipientPubkey) {
      return NextResponse.json(
        createApiError('VALIDATION_ERROR', {
          message: 'Encrypted blob must include ciphertext, boxNonce, ephemeralPubkey, recipientPubkey',
        }),
        { status: 400 }
      )
    }

    // Generate a short blob ID for the URL
    const blobId = randomUUID().replace(/-/g, '').slice(0, 16)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const blobUrl = `${baseUrl}/api/blobs/${blobId}`

    // In production: upload to Arweave/IPFS and return the permanent URL.
    // For devnet demo: store in database as a JSON blob.
    const { prisma } = await import('@marlin/db')
    await prisma.encryptedBlob.create({
      data: {
        id: blobId,
        merchantId: session.merchantId,
        payload: JSON.stringify(body),
      },
    })

    return NextResponse.json({ blobUrl, blobId }, { status: 201 })
  } catch (err) {
    console.error('Blob upload error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
