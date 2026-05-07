import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { getConnection, getProgramId } from '@/lib/solana'
import {
  ulidToBytes,
  bytesToHex,
  deriveMerchantPda,
} from '@marlin/shared'
import { apiSuccess, apiList, apiError, parsePagination } from '@/lib/api-response'
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js'
import { ulid } from 'ulidx'

/**
 * Derives the ConfidentialInvoice PDA.
 * Seeds: ["cinvoice", merchant_pda, invoice_id_bytes]
 */
function deriveConfidentialInvoicePda(
  merchantPda: PublicKey,
  invoiceIdBytes: Uint8Array,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('cinvoice'), merchantPda.toBuffer(), Buffer.from(invoiceIdBytes)],
    programId
  )
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const { searchParams } = request.nextUrl
    const { limit, cursor } = parsePagination(searchParams)

    const where: any = { merchantId: session.merchantId }
    if (cursor) where.id = { lt: cursor }

    const invoices = await prisma.confidentialInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    return apiList(invoices, limit)
  } catch (err) {
    console.error('Confidential invoices list error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const body = await request.json()
    const { commitmentHash, recipientPubkey, encryptedBlobUrl } = body

    if (!commitmentHash || !recipientPubkey || !encryptedBlobUrl) {
      return apiError('VALIDATION_ERROR', 'commitmentHash, recipientPubkey, and encryptedBlobUrl are required', 400)
    }

    // Validate commitment hash is 64 hex chars (32 bytes)
    if (!/^[0-9a-f]{64}$/i.test(commitmentHash)) {
      return apiError('VALIDATION_ERROR', 'commitmentHash must be 64 hex characters', 400)
    }

    // Validate blob URL length (max 128 bytes on-chain)
    const blobUrlBytes = Buffer.from(encryptedBlobUrl, 'utf-8')
    if (blobUrlBytes.length > 128) {
      return apiError('VALIDATION_ERROR', 'encryptedBlobUrl must be <= 128 bytes', 400)
    }

    // Generate ULID for invoice ID
    const invoiceUlid = ulid()
    const invoiceIdBytes = ulidToBytes(invoiceUlid)
    const onchainId = bytesToHex(invoiceIdBytes)

    // Build Solana transaction
    const connection = getConnection()
    const programId = getProgramId()
    const merchantPubkey = new PublicKey(session.wallet)

    const [merchantPda] = deriveMerchantPda(merchantPubkey, programId)
    const [confidentialInvoicePda] = deriveConfidentialInvoicePda(
      merchantPda,
      invoiceIdBytes,
      programId
    )

    // Decode inputs to byte arrays
    const commitmentHashBytes = Buffer.from(commitmentHash, 'hex')
    const recipientPubkeyBytes = Buffer.from(recipientPubkey, 'base64')

    if (recipientPubkeyBytes.length !== 32) {
      return apiError('VALIDATION_ERROR', 'recipientPubkey must decode to 32 bytes', 400)
    }

    // Anchor instruction discriminator for create_confidential_invoice
    const { createHash } = require('node:crypto')
    const discriminator = createHash('sha256')
      .update('global:create_confidential_invoice')
      .digest()
      .slice(0, 8)

    // Encode instruction data
    const blobUrlLen = Buffer.alloc(4)
    blobUrlLen.writeUInt32LE(blobUrlBytes.length, 0)

    const instructionData = Buffer.concat([
      discriminator,
      Buffer.from(invoiceIdBytes),
      commitmentHashBytes,
      recipientPubkeyBytes,
      blobUrlLen,
      blobUrlBytes,
    ])

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: merchantPubkey, isSigner: true, isWritable: true },
        { pubkey: merchantPda, isSigner: false, isWritable: false },
        { pubkey: confidentialInvoicePda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    })

    const { blockhash } = await connection.getLatestBlockhash()
    const tx = new Transaction({ feePayer: merchantPubkey, recentBlockhash: blockhash })
    tx.add(ix)

    const unsignedTx = tx.serialize({ requireAllSignatures: false }).toString('base64')

    // Store in DB
    const confidentialInvoice = await prisma.confidentialInvoice.create({
      data: {
        onchainId,
        merchantId: session.merchantId,
        commitmentHash,
        recipientPubkey,
        encryptedBlobUrl,
        status: 'Open',
      },
    })

    const hostedCheckoutUrl = `${process.env.NEXT_PUBLIC_CHECKOUT_URL || 'http://localhost:3001'}/ci/${onchainId}`

    return apiSuccess({
      confidentialInvoice: {
        ...confidentialInvoice,
        hostedCheckoutUrl,
      },
      unsignedTx,
      hostedCheckoutUrl,
    }, 201)
  } catch (err) {
    console.error('Confidential invoice create error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
