import { Queue } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@marlin/db";
import { config } from "./config.js";
import { logger } from "./logger.js";

const connection = new IORedis(config.UPSTASH_REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const webhookQueue = new Queue("webhook-deliveries", {
  connection,
  defaultJobOptions: {
    attempts: 6,
    backoff: {
      type: "custom",
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export interface WebhookJobData {
  deliveryId: string;
}

/**
 * Create a WebhookDelivery record and enqueue it for delivery.
 */
export async function enqueueWebhook(
  merchantId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const delivery = await prisma.webhookDelivery.create({
    data: {
      merchantId,
      eventType,
      payload,
    },
  });

  await webhookQueue.add(
    "deliver",
    { deliveryId: delivery.id } satisfies WebhookJobData,
    {
      jobId: delivery.id,
    },
  );

  logger.info(
    { deliveryId: delivery.id, eventType, merchantId },
    "Webhook delivery enqueued",
  );
}
