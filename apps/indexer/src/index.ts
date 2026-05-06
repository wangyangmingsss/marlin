import express from "express";
import { timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { parseEventsFromLogs } from "./event-parser.js";
import { dispatchEvent } from "./handlers/index.js";
import { startPolling } from "./polling.js";
import { startWebhookWorker } from "./webhook-worker.js";
import { RetryableError } from "./errors.js";
import { prisma } from "@marlin/db";

const app = express();

// ── Middleware ───────────────────────────────────────────────────────

app.use(express.json({ limit: "1mb" }));

// ── Health check ────────────────────────────────────────────────────

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Helius webhook receiver ─────────────────────────────────────────

app.post("/webhooks/helius", async (req, res) => {
  const log = logger.child({ route: "webhooks/helius" });

  // Verify authorization header using timing-safe comparison to prevent timing attacks
  const authHeader = req.headers.authorization;
  const expectedAuth = `Bearer ${config.HELIUS_WEBHOOK_SECRET}`;
  if (
    !authHeader ||
    authHeader.length !== expectedAuth.length ||
    !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedAuth))
  ) {
    log.warn("Unauthorized webhook request");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Helius sends an array of transaction objects
  const transactions: any[] = Array.isArray(req.body) ? req.body : [req.body];

  log.info({ count: transactions.length }, "Received Helius webhook");

  // Acknowledge immediately — process async
  res.status(200).json({ received: true });

  for (const tx of transactions) {
    try {
      const signature: string | undefined =
        tx.signature ?? tx.transaction?.signatures?.[0];
      const logMessages: string[] | undefined =
        tx.meta?.logMessages ?? tx.logMessages;

      if (!signature || !logMessages) {
        log.debug("Skipping transaction without signature or logs");
        continue;
      }

      // Idempotency check
      const already = await prisma.processedTx.findUnique({
        where: { signature },
      });
      if (already) {
        log.debug({ sig: signature }, "Already processed, skipping");
        continue;
      }

      const events = parseEventsFromLogs(logMessages, config.MARLIN_PROGRAM_ID);

      for (const event of events) {
        try {
          await dispatchEvent(event, signature);
        } catch (err) {
          if (err instanceof RetryableError) {
            log.warn(
              { err, event: event.name, sig: signature },
              "Retryable error in webhook handler — poller will pick up",
            );
          } else {
            log.error(
              { err, event: event.name, sig: signature },
              "Failed to handle event from webhook",
            );
          }
        }
      }

      // Mark as processed
      await prisma.processedTx.create({
        data: { signature },
      }).catch(() => {
        // Ignore duplicate key errors
      });
    } catch (err) {
      log.error({ err }, "Error processing webhook transaction");
    }
  }
});

// ── Start server and background workers ─────────────────────────────

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, "Indexer HTTP server started");
});

const stopPolling = startPolling();
const webhookWorker = startWebhookWorker();

// ── Graceful shutdown ───────────────────────────────────────────────

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down...");

  stopPolling();

  await webhookWorker.close();

  server.close(() => {
    logger.info("HTTP server closed");
  });

  await prisma.$disconnect();

  logger.info("Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});
