import {
  Connection,
  PublicKey,
  type ConfirmedSignatureInfo,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { prisma } from "@marlin/db";
import { config } from "./config.js";
import { parseEventsFromLogs } from "./event-parser.js";
import { dispatchEvent } from "./handlers/index.js";
import { RetryableError } from "./errors.js";
import { logger } from "./logger.js";

const POLL_INTERVAL_MS = 30_000;
const CHECKPOINT_KEY = "marlin-program-poll";
const MAX_SIGS_PER_POLL = 100;
const MAX_RETRIES_PER_EVENT = 3;

let connection: Connection;

function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(config.SOLANA_RPC_URL, "confirmed");
  }
  return connection;
}

/**
 * Run a single poll cycle: fetch new signatures since last checkpoint,
 * parse events, and dispatch handlers.
 */
async function pollCycle(): Promise<void> {
  const log = logger.child({ component: "poller" });
  const conn = getConnection();
  const programId = new PublicKey(config.MARLIN_PROGRAM_ID);

  // Read checkpoint
  const checkpoint = await prisma.indexerCheckpoint.findUnique({
    where: { key: CHECKPOINT_KEY },
  });

  const opts: { limit: number; until?: string } = {
    limit: MAX_SIGS_PER_POLL,
  };
  if (checkpoint?.signature) {
    opts.until = checkpoint.signature;
  }

  let signatures: ConfirmedSignatureInfo[];
  try {
    signatures = await conn.getSignaturesForAddress(programId, opts);
  } catch (err) {
    log.error({ err }, "Failed to fetch signatures from Solana");
    return;
  }

  if (signatures.length === 0) {
    log.debug("No new signatures found");
    return;
  }

  // Signatures are returned newest-first; process oldest-first
  signatures.reverse();

  log.info({ count: signatures.length }, "Processing new signatures");

  for (const sigInfo of signatures) {
    if (sigInfo.err) {
      log.debug({ sig: sigInfo.signature }, "Skipping failed transaction");
      continue;
    }

    // Idempotency: skip already-processed transactions
    const alreadyProcessed = await prisma.processedTx.findUnique({
      where: { signature: sigInfo.signature },
    });
    if (alreadyProcessed) {
      log.debug({ sig: sigInfo.signature }, "Already processed, skipping");
      continue;
    }

    let tx: ParsedTransactionWithMeta | null;
    try {
      tx = await conn.getParsedTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });
    } catch (err) {
      log.error({ err, sig: sigInfo.signature }, "Failed to fetch transaction");
      continue;
    }

    if (!tx?.meta?.logMessages) {
      log.debug({ sig: sigInfo.signature }, "No log messages in transaction");
      continue;
    }

    const events = parseEventsFromLogs(
      tx.meta.logMessages,
      config.MARLIN_PROGRAM_ID,
    );

    for (const event of events) {
      let retries = 0;
      while (retries < MAX_RETRIES_PER_EVENT) {
        try {
          await dispatchEvent(event, sigInfo.signature);
          break;
        } catch (err) {
          if (err instanceof RetryableError && retries < MAX_RETRIES_PER_EVENT - 1) {
            retries++;
            log.warn(
              { event: event.name, sig: sigInfo.signature, retry: retries },
              "Retryable error, waiting before retry",
            );
            await sleep(2000 * retries);
          } else {
            log.error(
              { err, event: event.name, sig: sigInfo.signature },
              "Failed to handle event",
            );
            break;
          }
        }
      }
    }

    // Mark transaction as processed
    await prisma.processedTx.create({
      data: { signature: sigInfo.signature },
    }).catch(() => {
      // Ignore duplicate key errors (concurrent processing)
    });

    // Update checkpoint after each successful transaction
    await prisma.indexerCheckpoint.upsert({
      where: { key: CHECKPOINT_KEY },
      update: {
        signature: sigInfo.signature,
        slot: BigInt(sigInfo.slot),
      },
      create: {
        key: CHECKPOINT_KEY,
        signature: sigInfo.signature,
        slot: BigInt(sigInfo.slot),
      },
    });
  }

  log.info({ count: signatures.length }, "Poll cycle complete");
}

/**
 * Start the continuous polling loop.
 * Returns a cleanup function that stops the loop.
 */
export function startPolling(): () => void {
  const log = logger.child({ component: "poller" });
  let running = true;

  async function loop() {
    while (running) {
      try {
        await pollCycle();
      } catch (err) {
        log.error({ err }, "Unhandled error in poll cycle");
      }
      if (running) {
        await sleep(POLL_INTERVAL_MS);
      }
    }
  }

  loop();
  log.info({ intervalMs: POLL_INTERVAL_MS }, "Polling loop started");

  return () => {
    running = false;
    log.info("Polling loop stopped");
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
