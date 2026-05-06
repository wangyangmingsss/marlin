#!/usr/bin/env tsx
/**
 * Deploy mock PYUSD and USDG mints on devnet.
 *
 * Real PYUSD and USDG don't exist on devnet, so we deploy mock SPL tokens
 * with the same decimals (6) so the multi-stablecoin flow is verifiable.
 *
 * Usage: pnpm tsx scripts/deploy-devnet-mints.ts
 *
 * Prerequisites:
 * - Deployer wallet at DEPLOYER_KEYPAIR_PATH (or ~/.marlin/deployer.json)
 * - At least 1 SOL balance on devnet
 *
 * Outputs:
 * - Creates two new SPL mints on devnet
 * - Updates .env with PYUSD_MINT_DEVNET and USDG_MINT_DEVNET
 * - Prints Solscan links for verification
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { createMint } from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'

const RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const KEYPAIR_PATH =
  process.env.DEPLOYER_KEYPAIR_PATH ||
  `${process.env.HOME}/.marlin/deployer.json`

function upsertEnv(content: string, key: string, value: string): string {
  const re = new RegExp(`^${key}=.*$`, 'm')
  if (re.test(content)) {
    return content.replace(re, `${key}=${value}`)
  }
  return content + `\n${key}=${value}`
}

async function main() {
  const conn = new Connection(RPC, 'confirmed')
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'))),
  )

  console.log('Deployer:', payer.publicKey.toBase58())
  const bal = await conn.getBalance(payer.publicKey)
  console.log('Balance:', bal / LAMPORTS_PER_SOL, 'SOL')

  if (bal < 1 * LAMPORTS_PER_SOL) {
    throw new Error('Need at least 1 SOL for mint deploys. Run: solana airdrop 2 --url devnet')
  }

  // Create mock PYUSD mint (6 decimals, matches real PYUSD)
  console.log('\nCreating mock PYUSD mint (6 decimals)...')
  const pyusdMint = await createMint(
    conn,
    payer,
    payer.publicKey, // mint authority (deployer can mint test tokens)
    null, // no freeze authority
    6, // decimals
  )
  console.log('PYUSD mint:', pyusdMint.toBase58())

  // Create mock USDG mint (6 decimals)
  console.log('Creating mock USDG mint (6 decimals)...')
  const usdgMint = await createMint(
    conn,
    payer,
    payer.publicKey,
    null,
    6,
  )
  console.log('USDG mint:', usdgMint.toBase58())

  // Update .env file
  const envFile = path.resolve(__dirname, '..', '.env')
  let envContent = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf-8') : ''

  envContent = upsertEnv(envContent, 'PYUSD_MINT_DEVNET', pyusdMint.toBase58())
  envContent = upsertEnv(envContent, 'USDG_MINT_DEVNET', usdgMint.toBase58())
  envContent = upsertEnv(envContent, 'NEXT_PUBLIC_PYUSD_MINT', pyusdMint.toBase58())
  envContent = upsertEnv(envContent, 'NEXT_PUBLIC_USDG_MINT', usdgMint.toBase58())

  fs.writeFileSync(envFile, envContent)

  console.log('\nSaved to .env:')
  console.log(`  PYUSD_MINT_DEVNET=${pyusdMint.toBase58()}`)
  console.log(`  USDG_MINT_DEVNET=${usdgMint.toBase58()}`)

  console.log('\nSolscan links:')
  console.log(`  PYUSD: https://solscan.io/token/${pyusdMint.toBase58()}?cluster=devnet`)
  console.log(`  USDG:  https://solscan.io/token/${usdgMint.toBase58()}?cluster=devnet`)

  console.log('\nNext steps:')
  console.log('  1. Update the program allowlist in programs/marlin/src/lib.rs if mint addresses differ from hardcoded ones')
  console.log('  2. Run: pnpm tsx scripts/seed-devnet.ts')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
