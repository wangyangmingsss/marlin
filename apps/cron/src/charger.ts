import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { PrismaClient } from '@prisma/client';
import {
  deriveMerchantPda,
  derivePlanPda,
  deriveSubscriptionPda,
  hexToBytes,
} from '@marlin/shared';
import type { Logger } from 'pino';
import type { Config } from './config';
import { getInstructionDiscriminator } from './utils';

const CHARGE_DISCRIMINATOR = getInstructionDiscriminator('charge_subscription');
const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

/**
 * Build the charge_subscription instruction for the Marlin on-chain program.
 *
 * Accounts (in order):
 *   0. caller            (signer, mutable) - the charger wallet
 *   1. subscription      (PDA, mutable)
 *   2. plan              (PDA)
 *   3. merchant          (PDA)
 *   4. customer_token_account (mutable) - customer's ATA for the mint
 *   5. merchant_token_account (mutable) - merchant's ATA for the mint
 *   6. protocol_fee_account   (mutable) - protocol fee receiver's ATA for the mint
 *   7. mint
 *   8. token_program
 *   9. associated_token_program
 *  10. system_program
 */
function buildChargeInstruction(opts: {
  caller: PublicKey;
  subscriptionPda: PublicKey;
  planPda: PublicKey;
  merchantPda: PublicKey;
  customerTokenAccount: PublicKey;
  merchantTokenAccount: PublicKey;
  protocolFeeAccount: PublicKey;
  mint: PublicKey;
  programId: PublicKey;
}): TransactionInstruction {
  const keys = [
    { pubkey: opts.caller, isSigner: true, isWritable: true },
    { pubkey: opts.subscriptionPda, isSigner: false, isWritable: true },
    { pubkey: opts.planPda, isSigner: false, isWritable: false },
    { pubkey: opts.merchantPda, isSigner: false, isWritable: false },
    { pubkey: opts.customerTokenAccount, isSigner: false, isWritable: true },
    { pubkey: opts.merchantTokenAccount, isSigner: false, isWritable: true },
    { pubkey: opts.protocolFeeAccount, isSigner: false, isWritable: true },
    { pubkey: opts.mint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: opts.programId,
    keys,
    data: CHARGE_DISCRIMINATOR,
  });
}

/**
 * Query all due subscriptions and submit charge transactions on-chain.
 * Errors for individual subscriptions are logged but do not halt processing.
 */
export async function processCharges(
  connection: Connection,
  charger: Keypair,
  config: Config,
  prisma: PrismaClient,
  logger: Logger,
): Promise<void> {
  const now = new Date();

  // 1. Query all active subscriptions whose next charge period has arrived
  const dueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'Active',
      currentPeriodEnd: { lte: now },
    },
    include: {
      plan: {
        include: {
          merchant: true,
        },
      },
      customer: true,
      charges: {
        where: { status: 'Confirmed' },
        select: { amount: true },
      },
    },
  });

  if (dueSubscriptions.length === 0) {
    logger.debug('No due subscriptions found');
    return;
  }

  logger.info({ count: dueSubscriptions.length }, 'Found due subscriptions');

  for (const sub of dueSubscriptions) {
    const subLogger = logger.child({
      subscriptionId: sub.id,
      onchainId: sub.onchainId,
      planId: sub.plan.onchainId,
    });

    try {
      const plan = sub.plan;
      const merchant = plan.merchant;
      const chargeAmount = plan.amount;

      // 2. Check total_charged + amount against a safety cap.
      //    We use the sum of all confirmed charges to guard against overcharging.
      const totalCharged = sub.charges.reduce(
        (acc, c) => acc + c.amount,
        0n,
      );

      // Safety: if total already exceeds a large multiple, skip
      // (On-chain program enforces maxAuthorized; this is a client-side guard.)
      const MAX_PERIODS = 1000n;
      const maxAuthorized = chargeAmount * MAX_PERIODS;
      if (totalCharged + chargeAmount > maxAuthorized) {
        subLogger.warn(
          { totalCharged: totalCharged.toString(), maxAuthorized: maxAuthorized.toString() },
          'Subscription exceeds max authorized amount, skipping',
        );
        continue;
      }

      // 3. Derive all PDAs and token accounts
      const merchantAuthority = new PublicKey(merchant.walletAddress);
      const customerWallet = new PublicKey(sub.customer.walletAddress);
      const mint = new PublicKey(plan.mint);

      const [merchantPda] = deriveMerchantPda(merchantAuthority, config.programId);
      const planIdBytes = hexToBytes(plan.onchainId);
      const [planPda] = derivePlanPda(merchantPda, planIdBytes, config.programId);
      const [subscriptionPda] = deriveSubscriptionPda(planPda, customerWallet, config.programId);

      const customerTokenAccount = getAssociatedTokenAddressSync(mint, customerWallet, true);
      const merchantTokenAccount = getAssociatedTokenAddressSync(mint, merchantAuthority, true);
      const protocolFeeAccount = getAssociatedTokenAddressSync(
        mint,
        config.protocolFeeReceiver,
        true,
      );

      // 4. Build instruction
      const instruction = buildChargeInstruction({
        caller: charger.publicKey,
        subscriptionPda,
        planPda,
        merchantPda,
        customerTokenAccount,
        merchantTokenAccount,
        protocolFeeAccount,
        mint,
        programId: config.programId,
      });

      // 5. Build and send transaction
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      const messageV0 = new TransactionMessage({
        payerKey: charger.publicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([charger]);

      const txSignature = await connection.sendTransaction(transaction, {
        skipPreflight: false,
        maxRetries: 2,
      });

      subLogger.info({ txSignature }, 'Transaction sent, awaiting confirmation');

      // 6. Create a pending charge record
      const periodStart = sub.currentPeriodEnd;
      const periodEnd = new Date(periodStart.getTime() + plan.intervalSeconds * 1000);

      const charge = await prisma.charge.create({
        data: {
          subscriptionId: sub.id,
          amount: chargeAmount,
          status: 'Pending',
          txSignature,
          periodStart,
          periodEnd,
          attemptedAt: new Date(),
        },
      });

      // 7. Confirm transaction
      try {
        const confirmation = await connection.confirmTransaction(
          { signature: txSignature, blockhash, lastValidBlockHeight },
          'confirmed',
        );

        if (confirmation.value.err) {
          subLogger.error(
            { txSignature, err: confirmation.value.err },
            'Transaction confirmed with error',
          );
          await prisma.charge.update({
            where: { id: charge.id },
            data: { status: 'Failed' },
          });
          continue;
        }

        // 8. Mark charge confirmed and advance subscription period
        await prisma.$transaction([
          prisma.charge.update({
            where: { id: charge.id },
            data: { status: 'Confirmed', confirmedAt: new Date() },
          }),
          prisma.subscription.update({
            where: { id: sub.id },
            data: {
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
            },
          }),
        ]);

        subLogger.info(
          { txSignature, chargeId: charge.id },
          'Charge confirmed and subscription period advanced',
        );
      } catch (confirmErr) {
        subLogger.error(
          { txSignature, err: confirmErr },
          'Transaction confirmation timed out or failed',
        );
        await prisma.charge.update({
          where: { id: charge.id },
          data: { status: 'Failed' },
        });
      }
    } catch (err) {
      subLogger.error({ err }, 'Failed to process subscription charge');
    }
  }
}
