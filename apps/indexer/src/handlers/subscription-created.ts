import { prisma } from "@marlin/db";
import type { SubscriptionCreatedEvent } from "../event-parser.js";
import { RetryableError } from "../errors.js";
import { enqueueWebhook } from "../webhook-queue.js";
import { logger } from "../logger.js";

export async function handleSubscriptionCreated(
  event: SubscriptionCreatedEvent,
  txSignature: string,
): Promise<void> {
  const log = logger.child({ handler: "SubscriptionCreated", txSignature });
  const subscriptionPda = event.data.subscription.toBase58();
  const planPda = event.data.plan.toBase58();
  const customerWallet = event.data.customer.toBase58();

  // Find the plan by on-chain PDA
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { onchainId: planPda },
    include: { merchant: true },
  });

  if (!plan) {
    log.warn({ planPda }, "SubscriptionPlan not found in DB, will retry");
    throw new RetryableError(`Plan not found for PDA ${planPda}`);
  }

  // Upsert customer
  const customer = await prisma.customer.upsert({
    where: {
      walletAddress_merchantId: {
        walletAddress: customerWallet,
        merchantId: plan.merchantId,
      },
    },
    update: {},
    create: {
      walletAddress: customerWallet,
      merchantId: plan.merchantId,
    },
  });

  // Create subscription (idempotent via unique planId+customerId)
  const now = new Date();
  const periodEndMs = now.getTime() + event.data.intervalSeconds * 1000;

  const subscription = await prisma.subscription.upsert({
    where: {
      planId_customerId: {
        planId: plan.id,
        customerId: customer.id,
      },
    },
    update: {},
    create: {
      onchainId: subscriptionPda,
      planId: plan.id,
      customerId: customer.id,
      status: "Active",
      currentPeriodStart: now,
      currentPeriodEnd: new Date(periodEndMs),
    },
  });

  log.info(
    { subscriptionId: subscription.id, planId: plan.id, customerId: customer.id },
    "Subscription created",
  );

  if (plan.merchant.webhookUrl) {
    await enqueueWebhook(plan.merchantId, "subscription.created", {
      subscriptionId: subscription.id,
      onchainId: subscriptionPda,
      planId: plan.id,
      planOnchainId: planPda,
      customer: customerWallet,
      mint: event.data.mint.toBase58(),
      amount: event.data.amount.toString(),
      intervalSeconds: event.data.intervalSeconds,
      txSignature,
      createdAt: now.toISOString(),
    });
  }
}
