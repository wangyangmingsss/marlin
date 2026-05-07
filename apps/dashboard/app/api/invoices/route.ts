import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createInvoiceSchema } from '@/lib/schemas'
import { apiSuccess, apiList, apiError, parsePagination } from '@/lib/api-response'
import { getConnection, getProgramId, getCluster } from '@/lib/solana'
import {
  parseDecimalToBigInt,
  getMints,
  MINT_DECIMALS,
  ulidToBytes,
  bytesToHex,
  deriveMerchantPda,
  deriveInvoicePda,
  BPS_DENOMINATOR,
} from '@marlin/shared'
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js'
import { ulid } from 'ulidx'

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentMerchant()
    if (!session) {
      return apiError('UNAUTHORIZED', 'Authentication required', 401)
    }

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const { limit, cursor } = parsePagination(searchParams)

    const where: any = { merchantId: session.merchantId }
    if (status) where.status = status
    if (search) {
      where.OR = [
        { onchainId: { contains: search } },
        { memo: { contains: search, mode: 'insensitive' } },
        { customer: { label: { contains: search, mode: 'insensitive' } } },
        { customer: { walletAddress: { contains: search } } },
      ]
    }
    if (cursor) {
      where.id = { lt: cursor }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { walletAddress: true, label: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    // Serialize BigInt
    const serialized = invoices.map((inv) => ({
      ...inv,
      amount: inv.amount.toString(),
    }))

    return apiList(serialized, limit)
  } catch (err) {
    console.error('Invoices list error:', err)
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
    const parsed = createInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues })
    }

    const { customerWallet, customerEmail, customerLabel, mint, lineItems, taxBps, memo, dueDate } = parsed.data
    const decimals = MINT_DECIMALS[mint]

    // Calculate total amount
    let subtotal = 0n
    for (const item of lineItems) {
      const unitPrice = parseDecimalToBigInt(item.unitPrice, decimals)
      subtotal += unitPrice * BigInt(item.quantity)
    }
    const tax = (subtotal * BigInt(taxBps)) / BigInt(BPS_DENOMINATOR)
    const totalAmount = subtotal + tax

    // Generate ULID
    const invoiceUlid = ulid()
    const invoiceIdBytes = ulidToBytes(invoiceUlid)
    const onchainId = bytesToHex(invoiceIdBytes)

    // Upsert customer
    const customer = await prisma.customer.upsert({
      where: {
        walletAddress_merchantId: {
          walletAddress: customerWallet,
          merchantId: session.merchantId,
        },
      },
      update: {
        ...(customerEmail && { email: customerEmail }),
        ...(customerLabel && { label: customerLabel }),
      },
      create: {
        walletAddress: customerWallet,
        merchantId: session.merchantId,
        email: customerEmail,
        label: customerLabel,
      },
    })

    // Create invoice in DB
    const invoice = await prisma.invoice.create({
      data: {
        onchainId,
        merchantId: session.merchantId,
        customerId: customer.id,
        mint,
        amount: totalAmount,
        status: 'Open',
        memo,
        expiresAt: dueDate ? new Date(dueDate) : null,
      },
      include: {
        customer: { select: { walletAddress: true, label: true, email: true } },
      },
    })

    // Build Solana transaction
    const connection = getConnection()
    const programId = getProgramId()
    const cluster = getCluster()
    const mints = getMints(cluster)
    const merchantPubkey = new PublicKey(session.wallet)
    const mintPubkey = new PublicKey(mints[mint])

    const [merchantPda] = deriveMerchantPda(merchantPubkey, programId)
    const [invoicePda] = deriveInvoicePda(merchantPda, invoiceIdBytes, programId)

    // Build create_invoice instruction
    const dataBuffer = Buffer.alloc(32)
    Buffer.from(invoiceIdBytes).copy(dataBuffer, 0)
    dataBuffer.writeBigUInt64LE(totalAmount, 16)
    const expiresTs = dueDate ? BigInt(Math.floor(new Date(dueDate).getTime() / 1000)) : 0n
    dataBuffer.writeBigUInt64LE(expiresTs, 24)

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: merchantPubkey, isSigner: true, isWritable: true },
        { pubkey: merchantPda, isSigner: false, isWritable: false },
        { pubkey: invoicePda, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([Buffer.from([0]), dataBuffer]),
    })

    const { blockhash } = await connection.getLatestBlockhash()
    const tx = new Transaction({ feePayer: merchantPubkey, recentBlockhash: blockhash })
    tx.add(ix)

    const unsignedTx = tx.serialize({ requireAllSignatures: false }).toString('base64')
    const hostedCheckoutUrl = `${process.env.NEXT_PUBLIC_CHECKOUT_URL || 'http://localhost:3001'}/i/${onchainId}`

    return apiSuccess({
      invoice: {
        ...invoice,
        amount: invoice.amount.toString(),
      },
      unsignedTx,
      hostedCheckoutUrl,
    }, 201)
  } catch (err) {
    console.error('Invoice create error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
