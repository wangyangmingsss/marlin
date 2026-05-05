import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { createHmac } from "node:crypto";
import { prisma } from "@marlin/db";
import { config } from "./config.js";
import { logger } from "./logger.js";
import type { WebhookJobData } from "./webhook-queue.js";

/** Retry delays in milliseconds: 1m, 5m, 30m, 2h, 12h */
const RETRY_DELAYS_MS = [
  1 * 60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  12 * 60 * 60_000,
];

function computeHmacSignature(
  secret: string,
  timestamp: number,
  body: string,
): string {
  const payload = `${timestamp}.${body}`;
  const hmac = createHmac("sha256", secret).update(payload).digest("hex");
  return `t=${timestamp},v1=${hmac}`;
}

/**
 * Start the BullMQ worker that delivers webhooks to merchants.
 */
export function startWebhookWorker(): Worker {
  const connection = new IORedis(config.UPSTASH_REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<WebhookJobData>(
    "webhook-deliveries",
    async (job: Job<WebhookJobData>) => {
      const { deliveryId } = job.data;
      const log = logger.child({ deliveryId, attempt: job.attemptsMade + 1 });

      // Fetch delivery record
      const delivery = await prisma.webhookDelivery.findUnique({
        where: { id: deliveryId },
      });

      if (!delivery) {
        log.warn("WebhookDelivery not found, discarding job");
        return;
      }

      // Already delivered — skip
      if (delivery.deliveredAt) {
        log.info("Webhook already delivered, skipping");
        return;
      }

      // Fetch merchant to get webhookUrl
      const merchant = await prisma.merchant.findUnique({
        where: { id: delivery.merchantId },
        select: { webhookUrl: true },
      });

      if (!merchant?.webhookUrl) {
        log.warn("Merchant has no webhookUrl configured, discarding");
        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            lastError: "No webhookUrl configured",
            attempts: { increment: 1 },
          },
        });
        return;
      }

      const bodyStr = JSON.stringify(delivery.payload);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = computeHmacSignature(
        config.HELIUS_WEBHOOK_SECRET,
        timestamp,
        bodyStr,
      );

      let httpStatus: number | null = null;
      let lastError: string | null = null;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);

        const response = await fetch(merchant.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Marlin-Signature": signature,
            "X-Marlin-Event": delivery.eventType,
            "X-Marlin-Delivery": delivery.id,
          },
          body: bodyStr,
          signal: controller.signal,
        });

        clearTimeout(timeout);
        httpStatus = response.status;

        if (!response.ok) {
          lastError = `HTTP ${response.status}: ${await response.text().catch(() => "")}`;
        }
      } catch (err) {
        lastError =
          err instanceof Error ? err.message : "Unknown delivery error";
        log.error({ err }, "Webhook delivery failed");
      }

      const now = new Date();
      const succeeded = httpStatus !== null && httpStatus >= 200 && httpStatus < 300;

      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          httpStatus,
          lastError,
          attempts: { increment: 1 },
          deliveredAt: succeeded ? now : undefined,
          nextRetryAt: succeeded
            ? null
            : computeNextRetry(job.attemptsMade),
        },
      });

      if (succeeded) {
        log.info({ httpStatus }, "Webhook delivered successfully");
      } else {
        log.warn({ httpStatus, lastError }, "Webhook delivery unsuccessful");
        throw new Error(lastError ?? "Delivery failed");
      }
    },
    {
      connection,
      concurrency: 10,
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          const idx = Math.min(attemptsMade, RETRY_DELAYS_MS.length - 1);
          return RETRY_DELAYS_MS[idx];
        },
      },
    },
  );

  worker.on("error", (err) => {
    logger.error({ err }, "Webhook worker error");
  });

  logger.info("Webhook delivery worker started");
  return worker;
}

function computeNextRetry(attemptsMade: number): Date | null {
  if (attemptsMade >= RETRY_DELAYS_MS.length) return null;
  const delayMs = RETRY_DELAYS_MS[Math.min(attemptsMade, RETRY_DELAYS_MS.length - 1)];
  return new Date(Date.now() + delayMs);
}
