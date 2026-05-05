import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { buildPaymentTxSchema } from '@/lib/schemas'
import { getConnection, getProgramId, getCluster } from '@/lib/solana'
import {
  createApiError,
  getMints,
  hexToBytes,
  deriveMerchantPda,
  deriveInvoicePda,
} from '@marlin/shared'
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const body = await request.json()
    const parsed = buildPaymentTxSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(createApiError('VALIDATION_ERROR', { issues: parsed.error.issues }), { status: 400 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { onchainId: params.token },
      include: { merchant: { select: { walletAddress: true } } },
    })

    if (!invoice) {
      return NextResponse.json(createApiError('INVOICE_NOT_FOUND'), { status: 404 })
    }

    if (invoice.status !== 'Open') {
      return NextResponse.json(createApiError('INVOICE_NOT_OPEN'), { status: 400 })
    }

    const { payerWallet } = parsed.data
    const connection = getConnection()
    const programId = getProgramId()
    const cluster = getCluster()
    const mints = getMints(cluster)

    const payerPubkey = new PublicKey(payerWallet)
    const merchantPubkey = new PublicKey(invoice.merchant.walletAddress)
    const mintPubkey = new PublicKey(mints[invoice.mint as keyof typeof mints])
    const invoiceIdBytes = hexToBytes(invoice.onchainId)

    const [merchantPda] = deriveMerchantPda(merchantPubkey, programId)
    const [invoicePda] = deriveInvoicePda(merchantPda, invoiceIdBytes, programId)

    const payerAta = getAssociatedTokenAddressSync(mintPubkey, payerPubkey)
    const merchantAta = getAssociatedTokenAddressSync(mintPubkey, merchantPubkey)

    // Build pay_invoice instruction
    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: payerPubkey, isSigner: true, isWritable: true },
        { pubkey: merchantPda, isSigner: false, isWritable: false },
        { pubkey: invoicePda, isSigner: false, isWritable: true },
        { pubkey: payerAta, isSigner: false, isWritable: true },
        { pubkey: merchantAta, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: false },
        { pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([1]), // 1 = pay_invoice discriminator
    })

    const { blockhash } = await connection.getLatestBlockhash()
    const tx = new Transaction({ feePayer: payerPubkey, recentBlockhash: blockhash })
    tx.add(ix)

    const unsignedTx = tx.serialize({ requireAllSignatures: false }).toString('base64')

    return NextResponse.json({ unsignedTx })
  } catch (err) {
    console.error('Build payment tx error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
