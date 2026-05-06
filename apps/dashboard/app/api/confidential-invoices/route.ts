import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { getConnection, getProgramId, getCluster } from '@/lib/solana'
import {
  createApiError,
  ulidToBytes,
  bytesToHex,
  deriveMerchantPda,
} from '@marlin/shared'
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
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const invoices = await prisma.confidentialInvoice.findMany({
      where: { merchantId: session.merchantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(invoices)
  } catch (err) {
    console.error('Confidential invoices list error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return NextResponse.json(createApiError('UNAUTHORIZED'), { status: 401 })
    }

    const body = await request.json()
    const { commitmentHash, recipientPubkey, encryptedBlobUrl } = body

    if (!commitmentHash || !recipientPubkey || !encryptedBlobUrl) {
      return NextResponse.json(
        createApiError('VALIDATION_ERROR', { message: 'commitmentHash, recipientPubkey, and encryptedBlobUrl are required' }),
        { status: 400 }
      )
    }

    // Validate commitment hash is 64 hex chars (32 bytes)
    if (!/^[0-9a-f]{64}$/i.test(commitmentHash)) {
      return NextResponse.json(
        createApiError('VALIDATION_ERROR', { message: 'commitmentHash must be 64 hex characters' }),
        { status: 400 }
      )
    }

    // Validate blob URL length (max 128 bytes on-chain)
    const blobUrlBytes = Buffer.from(encryptedBlobUrl, 'utf-8')
    if (blobUrlBytes.length > 128) {
      return NextResponse.json(
        createApiError('VALIDATION_ERROR', { message: 'encryptedBlobUrl must be <= 128 bytes' }),
        { status: 400 }
      )
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
      return NextResponse.json(
        createApiError('VALIDATION_ERROR', { message: 'recipientPubkey must decode to 32 bytes' }),
        { status: 400 }
      )
    }

    // Anchor instruction discriminator for create_confidential_invoice
    // sha256("global:create_confidential_invoice")[0..8]
    const { createHash } = require('node:crypto')
    const discriminator = createHash('sha256')
      .update('global:create_confidential_invoice')
      .digest()
      .slice(0, 8)

    // Encode instruction data:
    // discriminator(8) + invoice_id(16) + commitment_hash(32) + recipient_pubkey(32) + blob_url_len(4 LE) + blob_url(var)
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

    const hostedCheckoutUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/public/confidential-invoice/${onchainId}`

    return NextResponse.json({
      confidentialInvoice: {
        ...confidentialInvoice,
        hostedCheckoutUrl,
      },
      unsignedTx,
      hostedCheckoutUrl,
    }, { status: 201 })
  } catch (err) {
    console.error('Confidential invoice create error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
