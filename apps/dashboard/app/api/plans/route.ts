import { NextRequest } from 'next/server'
import { prisma } from '@marlin/db'
import { getCurrentMerchant } from '@/lib/auth'
import { createPlanSchema } from '@/lib/schemas'
import { apiSuccess, apiList, apiError, parsePagination } from '@/lib/api-response'
import { getConnection, getProgramId, getCluster } from '@/lib/solana'
import {
  parseDecimalToBigInt,
  getMints,
  MINT_DECIMALS,
  ulidToBytes,
  bytesToHex,
  deriveMerchantPda,
  derivePlanPda,
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
    const { limit, cursor } = parsePagination(searchParams)

    const where: any = { merchantId: session.merchantId }
    if (cursor) {
      where.id = { lt: cursor }
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where,
      include: { _count: { select: { subscriptions: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    })

    const serialized = plans.map((p) => ({ ...p, amount: p.amount.toString() }))
    return apiList(serialized, limit)
  } catch (err) {
    console.error('Plans list error:', err)
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
    const parsed = createPlanSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, { issues: parsed.error.issues })
    }

    const { mint, amount: amountStr, intervalSeconds, label, description } = parsed.data
    const decimals = MINT_DECIMALS[mint]
    const amount = parseDecimalToBigInt(amountStr, decimals)

    const planUlid = ulid()
    const planIdBytes = ulidToBytes(planUlid)
    const onchainId = bytesToHex(planIdBytes)

    const plan = await prisma.subscriptionPlan.create({
      data: {
        onchainId,
        merchantId: session.merchantId,
        mint,
        amount,
        intervalSeconds,
        label,
        description,
      },
    })

    // Build transaction
    const connection = getConnection()
    const programId = getProgramId()
    const cluster = getCluster()
    const mints = getMints(cluster)
    const merchantPubkey = new PublicKey(session.wallet)
    const mintPubkey = new PublicKey(mints[mint])
    const [merchantPda] = deriveMerchantPda(merchantPubkey, programId)
    const [planPda] = derivePlanPda(merchantPda, planIdBytes, programId)

    const dataBuffer = Buffer.alloc(32)
    Buffer.from(planIdBytes).copy(dataBuffer, 0)
    dataBuffer.writeBigUInt64LE(amount, 16)
    const intervalBuf = Buffer.alloc(4)
    intervalBuf.writeUInt32LE(intervalSeconds)

    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: merchantPubkey, isSigner: true, isWritable: true },
        { pubkey: merchantPda, isSigner: false, isWritable: false },
        { pubkey: planPda, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([Buffer.from([2]), dataBuffer, intervalBuf]),
    })

    const { blockhash } = await connection.getLatestBlockhash()
    const tx = new Transaction({ feePayer: merchantPubkey, recentBlockhash: blockhash })
    tx.add(ix)
    const unsignedTx = tx.serialize({ requireAllSignatures: false }).toString('base64')

    return apiSuccess({
      plan: { ...plan, amount: plan.amount.toString() },
      unsignedTx,
    }, 201)
  } catch (err) {
    console.error('Plan create error:', err)
    return apiError('INTERNAL', 'Internal server error', 500)
  }
}
