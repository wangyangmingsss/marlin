import "dotenv/config";

function env(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  /** Solana JSON-RPC endpoint */
  SOLANA_RPC_URL: env("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com"),

  /** Cluster label (mainnet-beta | devnet | localnet) */
  SOLANA_CLUSTER: env("SOLANA_CLUSTER", "mainnet-beta"),

  /** Marlin on-chain program ID */
  MARLIN_PROGRAM_ID: env("MARLIN_PROGRAM_ID"),

  /** Secret used to verify Helius webhook callbacks */
  HELIUS_WEBHOOK_SECRET: env("HELIUS_WEBHOOK_SECRET"),

  /** PostgreSQL connection string (read by Prisma) */
  DATABASE_URL: env("DATABASE_URL"),

  /** Redis URL for BullMQ */
  UPSTASH_REDIS_URL: env("UPSTASH_REDIS_URL"),

  /** HTTP port for the Express server */
  PORT: parseInt(env("PORT", "3001"), 10),

  /** Pino log level */
  LOG_LEVEL: env("LOG_LEVEL", "info"),
} as const;
