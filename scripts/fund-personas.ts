#!/usr/bin/env tsx
/**
 * Fund all persona wallets with SOL and mock stablecoins.
 *
 * Transfers 0.5 SOL to each persona from the deployer wallet,
 * then mints mock PYUSD and USDG tokens to customer wallets.
 *
 * Usage: pnpm tsx scripts/fund-personas.ts
 *
 * Note: For devnet USDC, each customer wallet must request from
 * https://faucet.circle.com manually (Circle controls mint authority).
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import * as fs from 'fs'

const RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const DEPLOYER_KEYPAIR_PATH =
  process.env.DEPLOYER_KEYPAIR_PATH || `${process.env.HOME}/.marlin/deployer.json`
const PERSONAS_DIR = `${process.env.HOME}/.marlin/personas`

const PYUSD = new PublicKey(
  process.env.PYUSD_MINT_DEVNET || 'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM',
)
const USDG = new PublicKey(
  process.env.USDG_MINT_DEVNET || 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
)

const PERSONAS = [
  'acme-coffee',
  'taylor-design',
  'devops-co',
  'newsletter-pro',
  'depinop',
  'customer-alice',
  'customer-bob',
  'customer-carol',
  'customer-dave',
  'customer-eve',
]

function loadKeypair(p: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, 'utf-8'))))
}

async function main() {
  const conn = new Connection(RPC, 'confirmed')
  const deployer = loadKeypair(DEPLOYER_KEYPAIR_PATH)

  console.log('Deployer:', deployer.publicKey.toBase58())
  const bal = await conn.getBalance(deployer.publicKey)
  console.log('Balance:', bal / LAMPORTS_PER_SOL, 'SOL\n')

  if (bal < 5 * LAMPORTS_PER_SOL) {
    console.warn('Warning: deployer has < 5 SOL. May not fund all personas.')
  }

  // Create persona wallets if needed
  if (!fs.existsSync(PERSONAS_DIR)) {
    fs.mkdirSync(PERSONAS_DIR, { recursive: true })
  }

  for (const name of PERSONAS) {
    const kpPath = `${PERSONAS_DIR}/${name}.json`
    if (!fs.existsSync(kpPath)) {
      const kp = Keypair.generate()
      fs.writeFileSync(kpPath, JSON.stringify(Array.from(kp.secretKey)))
      console.log(`Created ${name}: ${kp.publicKey.toBase58()}`)
    }
  }

  // Fund each with SOL
  console.log('\n--- Funding SOL ---')
  for (const name of PERSONAS) {
    const kp = loadKeypair(`${PERSONAS_DIR}/${name}.json`)
    const balance = await conn.getBalance(kp.publicKey)

    if (balance < 0.3 * LAMPORTS_PER_SOL) {
      try {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: deployer.publicKey,
            toPubkey: kp.publicKey,
            lamports: 0.5 * LAMPORTS_PER_SOL,
          }),
        )
        const sig = await sendAndConfirmTransaction(conn, tx, [deployer])
        console.log(`${name}: 0.5 SOL sent (${sig})`)
      } catch (e: any) {
        console.error(`${name}: failed - ${e.message?.slice(0, 80)}`)
      }
      await new Promise((r) => setTimeout(r, 500))
    } else {
      console.log(`${name}: OK (${(balance / LAMPORTS_PER_SOL).toFixed(3)} SOL)`)
    }
  }

  // Mint mock stablecoins to customer wallets
  console.log('\n--- Minting Mock Stablecoins ---')
  const customers = PERSONAS.filter((n) => n.startsWith('customer-'))

  for (const name of customers) {
    const kp = loadKeypair(`${PERSONAS_DIR}/${name}.json`)

    for (const [symbol, mint] of [['PYUSD', PYUSD], ['USDG', USDG]] as const) {
      const ata = getAssociatedTokenAddressSync(mint, kp.publicKey)
      try {
        const tx = new Transaction()
          .add(
            createAssociatedTokenAccountIdempotentInstruction(
              deployer.publicKey,
              ata,
              kp.publicKey,
              mint,
            ),
          )
          .add(createMintToInstruction(mint, ata, deployer.publicKey, 5000_000000n))
        const sig = await sendAndConfirmTransaction(conn, tx, [deployer])
        console.log(`${name} - ${symbol}: 5000 minted (${sig})`)
      } catch (e: any) {
        console.log(`${name} - ${symbol}: skipped (${e.message?.slice(0, 60)})`)
      }
      await new Promise((r) => setTimeout(r, 500))
    }

    // Note about USDC
    console.log(`${name} - USDC: request from https://faucet.circle.com (paste ${kp.publicKey.toBase58()})`)
  }

  console.log('\nDone! Next: pnpm tsx scripts/seed-devnet.ts')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
