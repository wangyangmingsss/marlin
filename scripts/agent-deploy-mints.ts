#!/usr/bin/env tsx
import {
  Connection, Keypair, LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { createMint } from '@solana/spl-token'
import * as fs from 'fs'

const RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const KEYPAIR_PATH = process.env.DEPLOYER_KEYPAIR_PATH || `${process.env.HOME}/.marlin/deployer.json`

async function main() {
  const conn = new Connection(RPC, 'confirmed')
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8')))
  )

  const bal = await conn.getBalance(payer.publicKey)
  console.log(`Deployer: ${payer.publicKey.toBase58()}`)
  console.log(`Balance: ${bal / LAMPORTS_PER_SOL} SOL`)
  if (bal < 0.5 * LAMPORTS_PER_SOL) {
    throw new Error('Need at least 0.5 SOL for mint creation')
  }

  // Create mock PYUSD mint
  console.log('Creating mock PYUSD mint...')
  const pyusdMint = await createMint(
    conn,
    payer,
    payer.publicKey, // mint authority
    null,            // no freeze authority
    6,               // 6 decimals (matches real PYUSD)
  )
  console.log('PYUSD mint:', pyusdMint.toBase58())

  // Create mock USDG mint
  console.log('Creating mock USDG mint...')
  const usdgMint = await createMint(
    conn, payer, payer.publicKey, null, 6,
  )
  console.log('USDG mint:', usdgMint.toBase58())

  // Save to .env (idempotent)
  let envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf-8') : ''
  function upsert(key: string, value: string) {
    const re = new RegExp(`^${key}=.*$`, 'm')
    if (re.test(envContent)) envContent = envContent.replace(re, `${key}=${value}`)
    else envContent += `\n${key}=${value}`
  }
  upsert('PYUSD_MINT_DEVNET', pyusdMint.toBase58())
  upsert('USDG_MINT_DEVNET', usdgMint.toBase58())
  fs.writeFileSync('.env', envContent.trim() + '\n')

  // Save Solscan links
  fs.writeFileSync('.marlin-mints.json', JSON.stringify({
    pyusd: {
      mint: pyusdMint.toBase58(),
      solscan: `https://solscan.io/token/${pyusdMint.toBase58()}?cluster=devnet`,
    },
    usdg: {
      mint: usdgMint.toBase58(),
      solscan: `https://solscan.io/token/${usdgMint.toBase58()}?cluster=devnet`,
    },
  }, null, 2))

  console.log('\n✅ Mints deployed.')
  console.log(`PYUSD: https://solscan.io/token/${pyusdMint.toBase58()}?cluster=devnet`)
  console.log(`USDG:  https://solscan.io/token/${usdgMint.toBase58()}?cluster=devnet`)
}

main().catch((e) => {
  console.error('❌ Mint deployment failed:', e.message || e)
  process.exit(1)
})
