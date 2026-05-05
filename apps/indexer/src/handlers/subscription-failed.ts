import { prisma } from "@marlin/db";
import type { SubscriptionFailedEvent } from "../event-parser.js";
import { RetryableError } from "../errors.js";
import { enqueueWebhook } from "../webhook-queue.js";
import { logger } from "../logger.js";

export async function handleSubscriptionFailed(
  event: SubscriptionFailedEvent,
  txSignature: string,
): Promise<void> {
  const log = logger.child({ handler: "SubscriptionFailed", txSignature });
  const subscriptionPda = event.data.subscription.toBase58();

  const subscription = await prisma.subscription.findUnique({
    where: { onchainId: subscriptionPda },
    include: { plan: { include: { merchant: true } } },
  });

  if (!subscription) {
    log.warn({ subscriptionPda }, "Subscription not found in DB, will retry");
    throw new RetryableError(`Subscription not found for PDA ${subscriptionPda}`);
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Create a failed charge record (idempotent by txSignature check)
    const existing = await tx.charge.findFirst({ where: { txSignature } });
    if (!existing) {
      await tx.charge.create({
        data: {
          subscriptionId: subscription.id,
          amount: subscription.plan.amount,
          status: "Failed",
          txSignature,
          periodStart: subscription.currentPeriodStart,
          periodEnd: subscription.currentPeriodEnd,
          attemptedAt: now,
        },
      });
    }

    await tx.subscription.update({
      where: { id: subscription.id },
      data: { status: "PastDue" },
    });
  });

  log.info({ subscriptionId: subscription.id }, "Subscription charge failed, marked PastDue");

  if (subscription.plan.merchant.webhookUrl) {
    await enqueueWebhook(
      subscription.plan.merchantId,
      "subscription.failed",
      {
        subscriptionId: subscription.id,
        onchainId: subscriptionPda,
        txSignature,
        failedAt: now.toISOString(),
      },
    );
  }
}
