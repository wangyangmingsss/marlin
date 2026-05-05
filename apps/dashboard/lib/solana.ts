import { Connection, PublicKey } from '@solana/web3.js'

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const CLUSTER = process.env.SOLANA_CLUSTER || 'devnet'

let connectionInstance: Connection | null = null

export function getConnection(): Connection {
  if (!connectionInstance) {
    connectionInstance = new Connection(RPC_URL, 'confirmed')
  }
  return connectionInstance
}

export function getCluster(): string {
  return CLUSTER
}

export function getProgramId(): PublicKey {
  const programId = process.env.MARLIN_PROGRAM_ID
  if (!programId) throw new Error('MARLIN_PROGRAM_ID not set')
  return new PublicKey(programId)
}

export function getPublicKey(address: string): PublicKey {
  return new PublicKey(address)
}

export async function confirmTransaction(signature: string): Promise<boolean> {
  const connection = getConnection()
  const result = await connection.confirmTransaction(signature, 'confirmed')
  return !result.value.err
}
