import { prisma } from "@marlin/db";
import type { SubscriptionStatusChangedEvent } from "../event-parser.js";
import type { SubscriptionStatus } from "@marlin/db";
import { RetryableError } from "../errors.js";
import { enqueueWebhook } from "../webhook-queue.js";
import { logger } from "../logger.js";

/**
 * Map on-chain status enum (u8) to Prisma SubscriptionStatus.
 * Must match the Anchor enum ordering.
 */
const STATUS_MAP: Record<number, SubscriptionStatus> = {
  0: "Active",
  1: "PastDue",
  2: "Cancelled",
  3: "Completed",
};

export async function handleSubscriptionStatusChanged(
  event: SubscriptionStatusChangedEvent,
  txSignature: string,
): Promise<void> {
  const log = logger.child({ handler: "SubscriptionStatusChanged", txSignature });
  const subscriptionPda = event.data.subscription.toBase58();
  const toStatus = STATUS_MAP[event.data.toStatus];

  if (!toStatus) {
    log.error({ toStatus: event.data.toStatus }, "Unknown subscription status, skipping");
    return;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { onchainId: subscriptionPda },
    include: { plan: { include: { merchant: true } } },
  });

  if (!subscription) {
    log.warn({ subscriptionPda }, "Subscription not found in DB, will retry");
    throw new RetryableError(`Subscription not found for PDA ${subscriptionPda}`);
  }

  // Idempotency: already at target status
  if (subscription.status === toStatus) {
    log.info({ subscriptionId: subscription.id, toStatus }, "Already at target status, skipping");
    return;
  }

  const now = new Date();
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: toStatus,
      cancelledAt: toStatus === "Cancelled" ? now : undefined,
    },
  });

  log.info(
    { subscriptionId: subscription.id, from: STATUS_MAP[event.data.fromStatus], to: toStatus },
    "Subscription status updated",
  );

  if (subscription.plan.merchant.webhookUrl) {
    await enqueueWebhook(
      subscription.plan.merchantId,
      "subscription.status_changed",
      {
        subscriptionId: subscription.id,
        onchainId: subscriptionPda,
        fromStatus: STATUS_MAP[event.data.fromStatus] ?? "Unknown",
        toStatus,
        txSignature,
        changedAt: now.toISOString(),
      },
    );
  }
}
