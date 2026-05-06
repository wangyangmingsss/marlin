import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@marlin/db'
import { buildSubscribeTxSchema } from '@/lib/schemas'
import { getConnection, getProgramId, getCluster } from '@/lib/solana'
import {
  createApiError,
  getMints,
  hexToBytes,
  deriveMerchantPda,
  derivePlanPda,
  deriveSubscriptionPda,
} from '@marlin/shared'
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const body = await request.json()
    const parsed = buildSubscribeTxSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(createApiError('VALIDATION_ERROR', { issues: parsed.error.issues }), { status: 400 })
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { onchainId: params.slug },
      include: { merchant: { select: { walletAddress: true } } },
    })

    if (!plan) {
      return NextResponse.json(createApiError('NOT_FOUND'), { status: 404 })
    }

    if (!plan.active) {
      return NextResponse.json(createApiError('NOT_FOUND', { reason: 'Plan is no longer active' }), { status: 404 })
    }

    const { customerWallet } = parsed.data
    const connection = getConnection()
    const programId = getProgramId()
    const cluster = getCluster()
    const mints = getMints(cluster)

    const customerPubkey = new PublicKey(customerWallet)
    const merchantPubkey = new PublicKey(plan.merchant.walletAddress)
    const mintPubkey = new PublicKey(mints[plan.mint as keyof typeof mints])
    const planIdBytes = hexToBytes(plan.onchainId)

    const [merchantPda] = deriveMerchantPda(merchantPubkey, programId)
    const [planPda] = derivePlanPda(merchantPda, planIdBytes, programId)
    const [subscriptionPda] = deriveSubscriptionPda(planPda, customerPubkey, programId)

    const customerAta = getAssociatedTokenAddressSync(mintPubkey, customerPubkey)
    const merchantAta = getAssociatedTokenAddressSync(mintPubkey, merchantPubkey)

    // Build subscribe instruction
    const ix = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: customerPubkey, isSigner: true, isWritable: true },
        { pubkey: merchantPda, isSigner: false, isWritable: false },
        { pubkey: planPda, isSigner: false, isWritable: false },
        { pubkey: subscriptionPda, isSigner: false, isWritable: true },
        { pubkey: customerAta, isSigner: false, isWritable: true },
        { pubkey: merchantAta, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: false },
        { pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([3]), // 3 = subscribe discriminator
    })

    const { blockhash } = await connection.getLatestBlockhash()
    const tx = new Transaction({ feePayer: customerPubkey, recentBlockhash: blockhash })
    tx.add(ix)

    const unsignedTx = tx.serialize({ requireAllSignatures: false }).toString('base64')

    return NextResponse.json({ unsignedTx })
  } catch (err) {
    console.error('Build subscribe tx error:', err)
    return NextResponse.json(createApiError('INTERNAL'), { status: 500 })
  }
}
