import { PublicKey } from '@solana/web3.js';

export interface Config {
  solanaRpcUrl: string;
  solanaCluster: string;
  programId: PublicKey;
  chargerPrivateKey: string;
  protocolFeeReceiver: PublicKey;
  chargeIntervalMs: number;
}

export function loadConfig(): Config {
  const solanaRpcUrl = requireEnv('SOLANA_RPC_URL');
  const solanaCluster = process.env.SOLANA_CLUSTER ?? 'devnet';
  const programIdStr = requireEnv('MARLIN_PROGRAM_ID');
  const chargerPrivateKey = requireEnv('CHARGER_PRIVATE_KEY');
  const protocolFeeReceiverStr = requireEnv('PROTOCOL_FEE_RECEIVER');
  const chargeIntervalMs = parseInt(process.env.CHARGE_INTERVAL_MS ?? '60000', 10);

  return {
    solanaRpcUrl,
    solanaCluster,
    programId: new PublicKey(programIdStr),
    chargerPrivateKey,
    protocolFeeReceiver: new PublicKey(protocolFeeReceiverStr),
    chargeIntervalMs,
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
