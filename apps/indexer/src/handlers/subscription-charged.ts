import { prisma } from "@marlin/db";
import type { SubscriptionChargedEvent } from "../event-parser.js";
import { RetryableError } from "../errors.js";
import { enqueueWebhook } from "../webhook-queue.js";
import { logger } from "../logger.js";

export async function handleSubscriptionCharged(
  event: SubscriptionChargedEvent,
  txSignature: string,
): Promise<void> {
  const log = logger.child({ handler: "SubscriptionCharged", txSignature });
  const subscriptionPda = event.data.subscription.toBase58();

  const subscription = await prisma.subscription.findUnique({
    where: { onchainId: subscriptionPda },
    include: { plan: { include: { merchant: true } } },
  });

  if (!subscription) {
    log.warn({ subscriptionPda }, "Subscription not found in DB, will retry");
    throw new RetryableError(`Subscription not found for PDA ${subscriptionPda}`);
  }

  // Idempotent: check if a charge with this txSignature already exists
  const existingCharge = await prisma.charge.findFirst({
    where: { txSignature },
  });

  if (existingCharge) {
    log.info({ chargeId: existingCharge.id }, "Charge already recorded, skipping");
    return;
  }

  const periodStart = new Date(Number(event.data.periodStart) * 1000);
  const periodEnd = new Date(Number(event.data.periodEnd) * 1000);
  const now = new Date();

  // Create charge record and update subscription in a transaction
  const charge = await prisma.$transaction(async (tx) => {
    const newCharge = await tx.charge.create({
      data: {
        subscriptionId: subscription.id,
        amount: event.data.amount,
        status: "Confirmed",
        txSignature,
        periodStart,
        periodEnd,
        attemptedAt: now,
        confirmedAt: now,
      },
    });

    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        status: "Active",
      },
    });

    return newCharge;
  });

  log.info(
    { chargeId: charge.id, subscriptionId: subscription.id },
    "Subscription charge recorded",
  );

  if (subscription.plan.merchant.webhookUrl) {
    await enqueueWebhook(
      subscription.plan.merchantId,
      "subscription.charged",
      {
        subscriptionId: subscription.id,
        onchainId: subscriptionPda,
        chargeId: charge.id,
        amount: event.data.amount.toString(),
        mint: event.data.mint.toBase58(),
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        txSignature,
        confirmedAt: now.toISOString(),
      },
    );
  }
}
