#!/usr/bin/env tsx
import {
  Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram,
  Transaction, sendAndConfirmTransaction, PublicKey,
} from '@solana/web3.js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'

const RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const KEYPAIR_PATH = process.env.DEPLOYER_KEYPAIR_PATH || `${process.env.HOME}/.marlin/deployer.json`
const PERSONA_DIR = '.marlin-personas'

const PERSONAS = [
  // Merchants
  { name: 'acme-coffee',     role: 'merchant', sol: 0.3, stablecoins: false },
  { name: 'taylor-design',   role: 'merchant', sol: 0.3, stablecoins: false },
  { name: 'devops-co',       role: 'merchant', sol: 0.3, stablecoins: false },
  { name: 'newsletter-pro',  role: 'merchant', sol: 0.3, stablecoins: false },
  { name: 'depin-op',        role: 'merchant', sol: 0.3, stablecoins: false },
  // Customers (need stablecoins to pay invoices)
  { name: 'cust-alice',      role: 'customer', sol: 0.2, stablecoins: true },
  { name: 'cust-bob',        role: 'customer', sol: 0.2, stablecoins: true },
  { name: 'cust-carol',      role: 'customer', sol: 0.2, stablecoins: true },
  { name: 'cust-dave',       role: 'customer', sol: 0.2, stablecoins: true },
  { name: 'cust-eve',        role: 'customer', sol: 0.2, stablecoins: true },
]

function loadKp(p: string) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, 'utf-8'))))
}

async function main() {
  fs.mkdirSync(PERSONA_DIR, { recursive: true })

  const conn = new Connection(RPC, 'confirmed')
  const deployer = loadKp(KEYPAIR_PATH)

  // Load mints from .env
  const envContent = fs.readFileSync('.env', 'utf-8')
  const pyusdMintStr = envContent.match(/^PYUSD_MINT_DEVNET=(.+)$/m)?.[1]
  const usdgMintStr = envContent.match(/^USDG_MINT_DEVNET=(.+)$/m)?.[1]

  if (!pyusdMintStr || !usdgMintStr) {
    throw new Error('Run agent-deploy-mints.ts first to set PYUSD_MINT_DEVNET and USDG_MINT_DEVNET in .env')
  }

  const pyusdMint = new PublicKey(pyusdMintStr)
  const usdgMint = new PublicKey(usdgMintStr)

  const out: Record<string, { address: string, role: string, sig?: string }> = {}

  for (const p of PERSONAS) {
    const kpFile = path.join(PERSONA_DIR, `${p.name}.json`)

    let kp: Keypair
    if (fs.existsSync(kpFile)) {
      kp = loadKp(kpFile)
      console.log(`▸ ${p.name}: ${kp.publicKey.toBase58()} (existing)`)
    } else {
      kp = Keypair.generate()
      fs.writeFileSync(kpFile, JSON.stringify(Array.from(kp.secretKey)))
      console.log(`▸ ${p.name}: ${kp.publicKey.toBase58()} (new)`)
    }

    out[p.name] = { address: kp.publicKey.toBase58(), role: p.role }

    // Fund SOL
    const bal = await conn.getBalance(kp.publicKey)
    if (bal < (p.sol * LAMPORTS_PER_SOL) / 2) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: deployer.publicKey,
          toPubkey: kp.publicKey,
          lamports: Math.floor(p.sol * LAMPORTS_PER_SOL),
        })
      )
      const sig = await sendAndConfirmTransaction(conn, tx, [deployer])
      console.log(`  funded SOL: ${sig}`)
    } else {
      console.log(`  already funded (${(bal / LAMPORTS_PER_SOL).toFixed(3)} SOL)`)
    }

    // Fund mock PYUSD + USDG (mint authority is deployer)
    if (p.stablecoins) {
      for (const [sym, mint] of [['PYUSD', pyusdMint], ['USDG', usdgMint]] as const) {
        const ata = getAssociatedTokenAddressSync(mint, kp.publicKey)
        const tx = new Transaction()
        tx.add(createAssociatedTokenAccountIdempotentInstruction(
          deployer.publicKey, ata, kp.publicKey, mint
        ))
        tx.add(createMintToInstruction(
          mint, ata, deployer.publicKey, 1000_000000n  // 1000 tokens
        ))
        try {
          const sig = await sendAndConfirmTransaction(conn, tx, [deployer])
          console.log(`  ${sym}: ${sig}`)
        } catch (e: any) {
          console.log(`  ${sym}: skipped (${e.message?.slice(0, 60)})`)
        }
      }
    }
  }

  fs.writeFileSync('.marlin-personas.json', JSON.stringify(out, null, 2))
  console.log('\n✅ Personas ready.')
}

main().catch((e) => { console.error(e); process.exit(1) })
