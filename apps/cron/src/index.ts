import 'dotenv/config';
import { Connection, Keypair } from '@solana/web3.js';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import bs58 from 'bs58';
import { loadConfig } from './config';
import { processCharges } from './charger';
import { sleep } from './utils';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard' },
  },
  level: process.env.LOG_LEVEL ?? 'info',
});

function parseKeypair(raw: string): Keypair {
  // Support both base58 and JSON byte-array formats
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    const bytes = JSON.parse(trimmed) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(bytes));
  }
  return Keypair.fromSecretKey(bs58.decode(trimmed));
}

async function main(): Promise<void> {
  const config = loadConfig();
  const connection = new Connection(config.solanaRpcUrl, 'confirmed');
  const charger = parseKeypair(config.chargerPrivateKey);
  const prisma = new PrismaClient();

  logger.info({
    cluster: config.solanaCluster,
    programId: config.programId.toBase58(),
    chargerWallet: charger.publicKey.toBase58(),
    protocolFeeReceiver: config.protocolFeeReceiver.toBase58(),
    intervalMs: config.chargeIntervalMs,
  }, 'Marlin cron charger starting');

  // Graceful shutdown
  let running = true;
  const shutdown = async () => {
    logger.info('Shutting down...');
    running = false;
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Main loop
  while (running) {
    const start = Date.now();
    try {
      await processCharges(connection, charger, config, prisma, logger);
    } catch (err) {
      logger.error({ err }, 'Unhandled error in processCharges cycle');
    }
    const elapsed = Date.now() - start;
    const waitMs = Math.max(0, config.chargeIntervalMs - elapsed);
    if (waitMs > 0 && running) {
      logger.debug({ waitMs }, 'Sleeping until next cycle');
      await sleep(waitMs);
    }
  }
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal error, exiting');
  process.exit(1);
});
