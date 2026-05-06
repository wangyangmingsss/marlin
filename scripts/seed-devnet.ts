#!/usr/bin/env tsx
/**
 * seed-devnet.ts — Generate 30+ diverse transactions on Marlin devnet program.
 *
 * Creates a realistic operational history:
 * - 5 merchants initialized
 * - 18 invoices (12 USDC, 4 PYUSD, 2 USDG)
 * - 10 invoices paid
 * - 2 invoices voided
 * - 3 subscription plans
 * - 4 customer subscriptions
 * - 6 subscription charges
 * - 1 paused, 1 canceled subscription
 *
 * Usage: pnpm tsx scripts/seed-devnet.ts
 *
 * Prerequisites:
 * - Program deployed on devnet (MRLNxMrRgKMFnHEuJPsWnbDzDRKdNHvisijd7Gg6MjZ)
 * - Persona wallets created and funded (run scripts/fund-personas.ts first)
 * - .env populated with PYUSD_MINT_DEVNET, USDG_MINT_DEVNET, MARLIN_PROGRAM_ID_DEVNET
 */
import * as anchor from '@coral-xyz/anchor'
import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
} from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// ─── Configuration ─────────────────────────────────────────────────────────

const RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const PROGRAM_ID = new PublicKey(
  process.env.MARLIN_PROGRAM_ID_DEVNET || 'MRLNxMrRgKMFnHEuJPsWnbDzDRKdNHvisijd7Gg6MjZ',
)
const USDC = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
const PYUSD = new PublicKey(
  process.env.PYUSD_MINT_DEVNET || 'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM',
)
const USDG = new PublicKey(
  process.env.USDG_MINT_DEVNET || 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
)
const PROTOCOL_FEE_RECEIVER = new PublicKey('HpwaQ1H2qqCs8a7ZEeq8s8Hm9qUvJnLvWTc6vXsbRFzT')

const DEPLOYER_KEYPAIR_PATH =
  process.env.DEPLOYER_KEYPAIR_PATH || `${process.env.HOME}/.marlin/deployer.json`
const PERSONAS_DIR = `${process.env.HOME}/.marlin/personas`
const CHECKPOINT_PATH = path.resolve(__dirname, '..', '.marlin-seed-checkpoint.json')

const DELAY_MS = 600 // delay between txs to avoid rate limits

// ─── Types ─────────────────────────────────────────────────────────────────

interface MerchantRecord {
  authority: string
  pda: string
  tx: string
}

interface InvoiceRecord {
  merchant: string
  pda: string
  invoiceId: string
  tx: string
  status: 'OPEN' | 'PAID' | 'VOID'
  mint: string
  amount: number
  description: string
}

interface PlanRecord {
  merchant: string
  pda: string
  planId: string
  tx: string
  mint: string
  amountPerPeriod: number
  name: string
}

interface SubRecord {
  plan: string
  customer: string
  pda: string
  tx: string
  status: 'ACTIVE' | 'PAUSED' | 'CANCELED'
  customerTokenAccount: string
}

interface ChargeRecord {
  subscription: string
  tx: string
}

interface Checkpoint {
  merchants: Record<string, MerchantRecord>
  invoices: InvoiceRecord[]
  plans: PlanRecord[]
  subs: SubRecord[]
  charges: ChargeRecord[]
  voids: Array<{ invoice: string; tx: string }>
  pauses: Array<{ subscription: string; tx: string }>
  cancels: Array<{ subscription: string; tx: string }>
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function loadCheckpoint(): Checkpoint {
  if (fs.existsSync(CHECKPOINT_PATH)) {
    return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'))
  }
  return { merchants: {}, invoices: [], plans: [], subs: [], charges: [], voids: [], pauses: [], cancels: [] }
}

function saveCheckpoint(cp: Checkpoint) {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2))
}

function loadKeypair(filePath: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(filePath, 'utf-8'))),
  )
}

function randomId(): Buffer {
  return crypto.randomBytes(16)
}

function toNameBytes(name: string): number[] {
  const buf = Buffer.alloc(64, 0)
  buf.write(name, 'utf-8')
  return Array.from(buf)
}

function memoHash(text: string): number[] {
  return Array.from(crypto.createHash('sha256').update(text).digest())
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// PDA derivations
function deriveMerchantPda(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('merchant'), authority.toBuffer()],
    PROGRAM_ID,
  )
}

function deriveInvoicePda(merchant: PublicKey, invoiceIdBytes: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('invoice'), merchant.toBuffer(), invoiceIdBytes],
    PROGRAM_ID,
  )
}

function derivePlanPda(merchant: PublicKey, planIdBytes: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('plan'), merchant.toBuffer(), planIdBytes],
    PROGRAM_ID,
  )
}

function deriveSubscriptionPda(plan: PublicKey, customer: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('sub'), plan.toBuffer(), customer.toBuffer()],
    PROGRAM_ID,
  )
}

// ─── Merchant names ────────────────────────────────────────────────────────

const MERCHANT_PERSONAS: Record<string, { displayName: string; mint: PublicKey }> = {
  'acme-coffee': { displayName: 'Acme Coffee Shop', mint: USDC },
  'taylor-design': { displayName: 'Taylor Design Studio', mint: USDC },
  'devops-co': { displayName: 'DevOps Co', mint: USDC },
  'newsletter-pro': { displayName: 'Newsletter Pro', mint: PYUSD },
  'depinop': { displayName: 'DePIN Operator', mint: USDG },
}

const CUSTOMER_PERSONAS = [
  'customer-alice',
  'customer-bob',
  'customer-carol',
  'customer-dave',
  'customer-eve',
]

// ─── Invoice specs ─────────────────────────────────────────────────────────

const INVOICE_SPECS = [
  { merchant: 'acme-coffee', amount: 4_500000, mint: USDC, desc: 'Espresso machine + setup' },
  { merchant: 'acme-coffee', amount: 12_000000, mint: USDC, desc: 'Bulk coffee bean order Q2' },
  { merchant: 'acme-coffee', amount: 25_000000, mint: USDC, desc: 'Catering - corporate event' },
  { merchant: 'acme-coffee', amount: 8_750000, mint: USDC, desc: 'Monthly supply - May' },
  { merchant: 'taylor-design', amount: 850_000000, mint: USDC, desc: 'Logo design + brand book' },
  { merchant: 'taylor-design', amount: 2400_000000, mint: USDC, desc: 'Website redesign milestone 1' },
  { merchant: 'taylor-design', amount: 1200_000000, mint: PYUSD, desc: 'Email campaign templates' },
  { merchant: 'taylor-design', amount: 600_000000, mint: PYUSD, desc: 'Social media assets pack' },
  { merchant: 'devops-co', amount: 199_000000, mint: USDC, desc: 'CI pipeline audit - May' },
  { merchant: 'devops-co', amount: 350_000000, mint: USDC, desc: 'K8s cluster migration' },
  { merchant: 'devops-co', amount: 500_000000, mint: USDG, desc: 'On-call rotation setup' },
  { merchant: 'devops-co', amount: 150_000000, mint: USDC, desc: 'Monitoring dashboard setup' },
  { merchant: 'newsletter-pro', amount: 9_900000, mint: USDC, desc: 'Newsletter pro plan - May' },
  { merchant: 'newsletter-pro', amount: 9_900000, mint: USDC, desc: 'Newsletter pro plan - June' },
  { merchant: 'newsletter-pro', amount: 199_000000, mint: PYUSD, desc: 'Annual sponsor slot' },
  { merchant: 'depinop', amount: 1500_000000, mint: USDC, desc: 'DePIN node billing - May' },
  { merchant: 'depinop', amount: 850_000000, mint: PYUSD, desc: 'Storage tier upgrade' },
  { merchant: 'depinop', amount: 320_000000, mint: USDG, desc: 'Bandwidth overage charge' },
]

// ─── Subscription plan specs ───────────────────────────────────────────────

const PLAN_SPECS = [
  {
    merchant: 'acme-coffee',
    name: 'Coffee Club Monthly',
    amount: 29_000000,
    mint: USDC,
    periodSeconds: 86400, // 1 day for demo (would be 30 days in prod)
    trialSeconds: 0,
  },
  {
    merchant: 'newsletter-pro',
    name: 'Pro Newsletter - Monthly',
    amount: 9_900000,
    mint: USDC,
    periodSeconds: 86400,
    trialSeconds: 86400, // 1 day trial
  },
  {
    merchant: 'devops-co',
    name: 'DevOps SaaS - Standard',
    amount: 199_000000,
    mint: USDC,
    periodSeconds: 86400,
    trialSeconds: 0,
  },
]

// ─── Program setup ─────────────────────────────────────────────────────────

async function setupProgram(): Promise<{ program: Program; deployer: Keypair; conn: Connection }> {
  const deployer = loadKeypair(DEPLOYER_KEYPAIR_PATH)
  const conn = new Connection(RPC, 'confirmed')
  const provider = new AnchorProvider(conn, new Wallet(deployer), {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })
  anchor.setProvider(provider)

  // Load IDL from target directory
  const idlPath = path.resolve(__dirname, '..', 'target', 'idl', 'marlin.json')
  if (!fs.existsSync(idlPath)) {
    throw new Error(
      `IDL not found at ${idlPath}. Run 'anchor build' first, or ensure target/idl/marlin.json exists.`,
    )
  }
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'))
  const program = new Program(idl, provider)

  return { program, deployer, conn }
}

// ─── Operations ────────────────────────────────────────────────────────────

async function initializeMerchant(
  program: Program,
  personaName: string,
  displayName: string,
  settlementMint: PublicKey,
): Promise<MerchantRecord> {
  const authority = loadKeypair(`${PERSONAS_DIR}/${personaName}.json`)
  const [merchantPda] = deriveMerchantPda(authority.publicKey)
  const merchantId = randomId()

  const tx = await program.methods
    .initializeMerchant(Array.from(merchantId), toNameBytes(displayName), settlementMint)
    .accounts({
      authority: authority.publicKey,
      merchant: merchantPda,
      settlementMint: settlementMint,
      systemProgram: SystemProgram.programId,
    })
    .signers([authority])
    .rpc()

  console.log(`  [merchant] ${displayName}: ${tx}`)
  return { authority: authority.publicKey.toBase58(), pda: merchantPda.toBase58(), tx }
}

async function createInvoice(
  program: Program,
  cp: Checkpoint,
  spec: { merchant: string; amount: number; mint: PublicKey; desc: string },
): Promise<InvoiceRecord> {
  const authority = loadKeypair(`${PERSONAS_DIR}/${spec.merchant}.json`)
  const merchantPda = new PublicKey(cp.merchants[spec.merchant].pda)
  const invoiceId = randomId()
  const [invoicePda] = deriveInvoicePda(merchantPda, invoiceId)

  const tx = await program.methods
    .createInvoice(
      Array.from(invoiceId),
      PublicKey.default, // anyone can pay
      new BN(spec.amount),
      spec.mint,
      new BN(0), // no expiry
      memoHash(spec.desc),
    )
    .accounts({
      authority: authority.publicKey,
      merchant: merchantPda,
      invoice: invoicePda,
      systemProgram: SystemProgram.programId,
    })
    .signers([authority])
    .rpc()

  console.log(`  [invoice] ${spec.desc.slice(0, 40)}: ${tx}`)
  return {
    merchant: spec.merchant,
    pda: invoicePda.toBase58(),
    invoiceId: invoiceId.toString('hex'),
    tx,
    status: 'OPEN',
    mint: spec.mint.toBase58(),
    amount: spec.amount,
    description: spec.desc,
  }
}

async function payInvoice(
  program: Program,
  conn: Connection,
  deployer: Keypair,
  invoiceRecord: InvoiceRecord,
  payerPersona: string,
): Promise<string> {
  const payer = loadKeypair(`${PERSONAS_DIR}/${payerPersona}.json`)
  const invoicePda = new PublicKey(invoiceRecord.pda)
  const merchantPda = new PublicKey(
    Object.values(program.provider as any).length
      ? invoiceRecord.merchant
      : invoiceRecord.merchant,
  )
  // Fetch merchant PDA from checkpoint
  const merchantAuthority = loadKeypair(`${PERSONAS_DIR}/${invoiceRecord.merchant}.json`)
  const [merchantPdaKey] = deriveMerchantPda(merchantAuthority.publicKey)
  const mint = new PublicKey(invoiceRecord.mint)

  const payerAta = getAssociatedTokenAddressSync(mint, payer.publicKey)
  const merchantAta = getAssociatedTokenAddressSync(mint, merchantAuthority.publicKey)
  const feeAta = getAssociatedTokenAddressSync(mint, PROTOCOL_FEE_RECEIVER)

  const tx = await program.methods
    .payInvoice()
    .accounts({
      payer: payer.publicKey,
      merchant: merchantPdaKey,
      invoice: invoicePda,
      mint: mint,
      payerTokenAccount: payerAta,
      merchantTokenAccount: merchantAta,
      merchantAuthority: merchantAuthority.publicKey,
      protocolFeeReceiver: PROTOCOL_FEE_RECEIVER,
      protocolFeeTokenAccount: feeAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([payer])
    .rpc()

  console.log(`  [pay] ${invoiceRecord.description.slice(0, 30)} by ${payerPersona}: ${tx}`)
  return tx
}

async function voidInvoice(
  program: Program,
  invoiceRecord: InvoiceRecord,
  cp: Checkpoint,
): Promise<string> {
  const authority = loadKeypair(`${PERSONAS_DIR}/${invoiceRecord.merchant}.json`)
  const [merchantPda] = deriveMerchantPda(authority.publicKey)
  const invoicePda = new PublicKey(invoiceRecord.pda)

  const tx = await program.methods
    .voidInvoice()
    .accounts({
      authority: authority.publicKey,
      merchant: merchantPda,
      invoice: invoicePda,
    })
    .signers([authority])
    .rpc()

  console.log(`  [void] ${invoiceRecord.description.slice(0, 30)}: ${tx}`)
  return tx
}

async function createSubscriptionPlan(
  program: Program,
  cp: Checkpoint,
  spec: typeof PLAN_SPECS[0],
): Promise<PlanRecord> {
  const authority = loadKeypair(`${PERSONAS_DIR}/${spec.merchant}.json`)
  const [merchantPda] = deriveMerchantPda(authority.publicKey)
  const planId = randomId()
  const [planPda] = derivePlanPda(merchantPda, planId)

  const tx = await program.methods
    .createSubscriptionPlan(
      Array.from(planId),
      toNameBytes(spec.name),
      new BN(spec.amount),
      spec.mint,
      spec.periodSeconds,
      spec.trialSeconds,
    )
    .accounts({
      authority: authority.publicKey,
      merchant: merchantPda,
      plan: planPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([authority])
    .rpc()

  console.log(`  [plan] ${spec.name}: ${tx}`)
  return {
    merchant: spec.merchant,
    pda: planPda.toBase58(),
    planId: planId.toString('hex'),
    tx,
    mint: spec.mint.toBase58(),
    amountPerPeriod: spec.amount,
    name: spec.name,
  }
}

async function subscribeToPlan(
  program: Program,
  planRecord: PlanRecord,
  customerPersona: string,
  maxAuthorized: number,
  cp: Checkpoint,
): Promise<SubRecord> {
  const customer = loadKeypair(`${PERSONAS_DIR}/${customerPersona}.json`)
  const planPda = new PublicKey(planRecord.pda)
  const mint = new PublicKey(planRecord.mint)
  const merchantAuthority = loadKeypair(`${PERSONAS_DIR}/${planRecord.merchant}.json`)
  const [merchantPda] = deriveMerchantPda(merchantAuthority.publicKey)
  const [subPda] = deriveSubscriptionPda(planPda, customer.publicKey)
  const customerAta = getAssociatedTokenAddressSync(mint, customer.publicKey)

  const tx = await program.methods
    .subscribe(new BN(maxAuthorized))
    .accounts({
      customer: customer.publicKey,
      merchant: merchantPda,
      plan: planPda,
      subscription: subPda,
      customerTokenAccount: customerAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([customer])
    .rpc()

  console.log(`  [subscribe] ${customerPersona} -> ${planRecord.name}: ${tx}`)
  return {
    plan: planRecord.pda,
    customer: customer.publicKey.toBase58(),
    pda: subPda.toBase58(),
    tx,
    status: 'ACTIVE',
    customerTokenAccount: customerAta.toBase58(),
  }
}

async function chargeSubscription(
  program: Program,
  deployer: Keypair,
  subRecord: SubRecord,
  planRecord: PlanRecord,
  cp: Checkpoint,
): Promise<string> {
  const planPda = new PublicKey(planRecord.pda)
  const subPda = new PublicKey(subRecord.pda)
  const mint = new PublicKey(planRecord.mint)
  const merchantAuthority = loadKeypair(`${PERSONAS_DIR}/${planRecord.merchant}.json`)
  const [merchantPda] = deriveMerchantPda(merchantAuthority.publicKey)
  const customerAta = new PublicKey(subRecord.customerTokenAccount)
  const merchantAta = getAssociatedTokenAddressSync(mint, merchantAuthority.publicKey)
  const feeAta = getAssociatedTokenAddressSync(mint, PROTOCOL_FEE_RECEIVER)

  const tx = await program.methods
    .chargeSubscription()
    .accounts({
      cranker: deployer.publicKey,
      merchant: merchantPda,
      plan: planPda,
      subscription: subPda,
      mint: mint,
      customerTokenAccount: customerAta,
      merchantAuthority: merchantAuthority.publicKey,
      merchantTokenAccount: merchantAta,
      protocolFeeReceiver: PROTOCOL_FEE_RECEIVER,
      protocolFeeTokenAccount: feeAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([deployer])
    .rpc()

  console.log(`  [charge] sub ${subRecord.pda.slice(0, 8)}...: ${tx}`)
  return tx
}

async function pauseSubscription(
  program: Program,
  subRecord: SubRecord,
  planRecord: PlanRecord,
): Promise<string> {
  const customer = loadKeypair(
    `${PERSONAS_DIR}/${CUSTOMER_PERSONAS.find((c) => {
      const kp = loadKeypair(`${PERSONAS_DIR}/${c}.json`)
      return kp.publicKey.toBase58() === subRecord.customer
    })}.json`,
  )
  const [merchantPda] = deriveMerchantPda(
    loadKeypair(`${PERSONAS_DIR}/${planRecord.merchant}.json`).publicKey,
  )
  const planPda = new PublicKey(planRecord.pda)
  const subPda = new PublicKey(subRecord.pda)

  const tx = await program.methods
    .pauseSubscription()
    .accounts({
      signer: customer.publicKey,
      merchant: merchantPda,
      plan: planPda,
      subscription: subPda,
    })
    .signers([customer])
    .rpc()

  console.log(`  [pause] sub ${subRecord.pda.slice(0, 8)}...: ${tx}`)
  return tx
}

async function cancelSubscription(
  program: Program,
  subRecord: SubRecord,
  planRecord: PlanRecord,
): Promise<string> {
  const customer = loadKeypair(
    `${PERSONAS_DIR}/${CUSTOMER_PERSONAS.find((c) => {
      const kp = loadKeypair(`${PERSONAS_DIR}/${c}.json`)
      return kp.publicKey.toBase58() === subRecord.customer
    })}.json`,
  )
  const [merchantPda] = deriveMerchantPda(
    loadKeypair(`${PERSONAS_DIR}/${planRecord.merchant}.json`).publicKey,
  )
  const planPda = new PublicKey(planRecord.pda)
  const subPda = new PublicKey(subRecord.pda)
  const mint = new PublicKey(planRecord.mint)
  const customerAta = new PublicKey(subRecord.customerTokenAccount)

  const tx = await program.methods
    .cancelSubscription()
    .accounts({
      signer: customer.publicKey,
      merchant: merchantPda,
      plan: planPda,
      subscription: subPda,
      customerTokenAccount: customerAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([customer])
    .rpc()

  console.log(`  [cancel] sub ${subRecord.pda.slice(0, 8)}...: ${tx}`)
  return tx
}

// ─── Funding helper ────────────────────────────────────────────────────────

async function ensurePersonasFunded(conn: Connection, deployer: Keypair) {
  console.log('\n=== Phase 0: Ensure personas exist and are funded ===')

  const allPersonas = [...Object.keys(MERCHANT_PERSONAS), ...CUSTOMER_PERSONAS]

  // Create persona wallets if they don't exist
  if (!fs.existsSync(PERSONAS_DIR)) {
    fs.mkdirSync(PERSONAS_DIR, { recursive: true })
  }

  for (const name of allPersonas) {
    const kpPath = `${PERSONAS_DIR}/${name}.json`
    if (!fs.existsSync(kpPath)) {
      const kp = Keypair.generate()
      fs.writeFileSync(kpPath, JSON.stringify(Array.from(kp.secretKey)))
      console.log(`  Created wallet for ${name}: ${kp.publicKey.toBase58()}`)
    }
  }

  // Fund each persona with SOL from deployer
  for (const name of allPersonas) {
    const kp = loadKeypair(`${PERSONAS_DIR}/${name}.json`)
    const bal = await conn.getBalance(kp.publicKey)
    if (bal < 0.1 * 1e9) {
      try {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: deployer.publicKey,
            toPubkey: kp.publicKey,
            lamports: 0.5 * 1e9, // 0.5 SOL
          }),
        )
        const sig = await sendAndConfirmTransaction(conn, tx, [deployer])
        console.log(`  Funded ${name} with 0.5 SOL: ${sig}`)
      } catch (e: any) {
        console.log(`  Warning: could not fund ${name}: ${e.message?.slice(0, 80)}`)
      }
      await delay(DELAY_MS)
    } else {
      console.log(`  ${name}: already has ${(bal / 1e9).toFixed(2)} SOL`)
    }
  }

  // Mint mock PYUSD and USDG to customer wallets (deployer is mint authority)
  console.log('\n  Minting mock stablecoins to customer wallets...')
  for (const name of CUSTOMER_PERSONAS) {
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
        console.log(`  Minted 5000 ${symbol} to ${name}: ${sig}`)
      } catch (e: any) {
        console.log(`  ${symbol} mint to ${name} skipped: ${e.message?.slice(0, 60)}`)
      }
      await delay(DELAY_MS)
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('Marlin Devnet Seed Script')
  console.log('='.repeat(60))
  console.log(`Program ID: ${PROGRAM_ID.toBase58()}`)
  console.log(`RPC: ${RPC}`)
  console.log(`Checkpoint: ${CHECKPOINT_PATH}`)

  const { program, deployer, conn } = await setupProgram()
  const cp = loadCheckpoint()

  console.log(`\nDeployer: ${deployer.publicKey.toBase58()}`)
  const balance = await conn.getBalance(deployer.publicKey)
  console.log(`Balance: ${balance / 1e9} SOL`)

  if (balance < 2 * 1e9) {
    throw new Error('Need at least 2 SOL. Request from devnet faucet.')
  }

  // Phase 0: Fund personas
  await ensurePersonasFunded(conn, deployer)

  // Phase 1: Create merchants
  console.log('\n=== Phase 1: Initialize Merchants (5 txs) ===')
  for (const [name, config] of Object.entries(MERCHANT_PERSONAS)) {
    if (cp.merchants[name]) {
      console.log(`  [skip] ${name} already initialized`)
      continue
    }
    try {
      cp.merchants[name] = await initializeMerchant(program, name, config.displayName, config.mint)
      saveCheckpoint(cp)
    } catch (e: any) {
      console.error(`  [error] ${name}: ${e.message?.slice(0, 100)}`)
    }
    await delay(DELAY_MS)
  }

  // Phase 2: Create invoices
  console.log('\n=== Phase 2: Create Invoices (18 txs) ===')
  for (const spec of INVOICE_SPECS) {
    if (cp.invoices.length >= INVOICE_SPECS.length) break
    // Skip if we already have an invoice with this description
    if (cp.invoices.find((i) => i.description === spec.desc)) {
      console.log(`  [skip] ${spec.desc.slice(0, 40)}`)
      continue
    }
    if (!cp.merchants[spec.merchant]) {
      console.log(`  [skip] merchant ${spec.merchant} not initialized`)
      continue
    }
    try {
      const record = await createInvoice(program, cp, spec)
      cp.invoices.push(record)
      saveCheckpoint(cp)
    } catch (e: any) {
      console.error(`  [error] ${spec.desc.slice(0, 40)}: ${e.message?.slice(0, 100)}`)
    }
    await delay(DELAY_MS)
  }

  // Phase 3: Pay invoices (10 payments from different customers)
  console.log('\n=== Phase 3: Pay Invoices (10 txs) ===')
  const openInvoices = cp.invoices.filter((i) => i.status === 'OPEN')
  const payAssignments = [
    { invoiceIdx: 0, payer: 'customer-alice' },
    { invoiceIdx: 1, payer: 'customer-bob' },
    { invoiceIdx: 2, payer: 'customer-carol' },
    { invoiceIdx: 3, payer: 'customer-dave' },
    { invoiceIdx: 4, payer: 'customer-eve' },
    { invoiceIdx: 5, payer: 'customer-alice' },
    { invoiceIdx: 6, payer: 'customer-bob' },
    { invoiceIdx: 7, payer: 'customer-carol' },
    { invoiceIdx: 8, payer: 'customer-dave' },
    { invoiceIdx: 9, payer: 'customer-alice' },
  ]

  let paidCount = cp.invoices.filter((i) => i.status === 'PAID').length
  for (const assignment of payAssignments) {
    if (paidCount >= 10) break
    const invoice = openInvoices[assignment.invoiceIdx]
    if (!invoice) continue
    try {
      await payInvoice(program, conn, deployer, invoice, assignment.payer)
      invoice.status = 'PAID'
      paidCount++
      saveCheckpoint(cp)
    } catch (e: any) {
      console.error(`  [error] pay ${invoice.description.slice(0, 30)}: ${e.message?.slice(0, 100)}`)
    }
    await delay(DELAY_MS)
  }

  // Phase 4: Void 2 invoices
  console.log('\n=== Phase 4: Void Invoices (2 txs) ===')
  const stillOpen = cp.invoices.filter((i) => i.status === 'OPEN')
  for (let i = 0; i < Math.min(2, stillOpen.length); i++) {
    if (cp.voids.length >= 2) {
      console.log('  [skip] already voided 2')
      break
    }
    const inv = stillOpen[i]
    try {
      const tx = await voidInvoice(program, inv, cp)
      inv.status = 'VOID'
      cp.voids.push({ invoice: inv.pda, tx })
      saveCheckpoint(cp)
    } catch (e: any) {
      console.error(`  [error] void: ${e.message?.slice(0, 100)}`)
    }
    await delay(DELAY_MS)
  }

  // Phase 5: Create subscription plans
  console.log('\n=== Phase 5: Create Subscription Plans (3 txs) ===')
  for (const spec of PLAN_SPECS) {
    if (cp.plans.find((p) => p.name === spec.name)) {
      console.log(`  [skip] ${spec.name}`)
      continue
    }
    if (!cp.merchants[spec.merchant]) {
      console.log(`  [skip] merchant ${spec.merchant} not initialized`)
      continue
    }
    try {
      const record = await createSubscriptionPlan(program, cp, spec)
      cp.plans.push(record)
      saveCheckpoint(cp)
    } catch (e: any) {
      console.error(`  [error] plan ${spec.name}: ${e.message?.slice(0, 100)}`)
    }
    await delay(DELAY_MS)
  }

  // Phase 6: Subscribe customers (4 subscriptions)
  console.log('\n=== Phase 6: Subscribe Customers (4 txs) ===')
  const subAssignments = [
    { planIdx: 0, customer: 'customer-alice', maxAuth: 290_000000 }, // 10 months
    { planIdx: 0, customer: 'customer-bob', maxAuth: 145_000000 },   // 5 months
    { planIdx: 1, customer: 'customer-carol', maxAuth: 118_800000 }, // 12 months
    { planIdx: 2, customer: 'customer-dave', maxAuth: 1194_000000 }, // 6 months
  ]

  for (const assignment of subAssignments) {
    const plan = cp.plans[assignment.planIdx]
    if (!plan) {
      console.log(`  [skip] plan index ${assignment.planIdx} not created`)
      continue
    }
    if (cp.subs.find((s) => s.customer === loadKeypair(`${PERSONAS_DIR}/${assignment.customer}.json`).publicKey.toBase58() && s.plan === plan.pda)) {
      console.log(`  [skip] ${assignment.customer} already subscribed to ${plan.name}`)
      continue
    }
    try {
      const record = await subscribeToPlan(program, plan, assignment.customer, assignment.maxAuth, cp)
      cp.subs.push(record)
      saveCheckpoint(cp)
    } catch (e: any) {
      console.error(`  [error] subscribe ${assignment.customer}: ${e.message?.slice(0, 100)}`)
    }
    await delay(DELAY_MS)
  }

  // Phase 7: Charge subscriptions (6 charges)
  console.log('\n=== Phase 7: Charge Subscriptions (6 txs) ===')
  // We charge each active subscription 1-2 times
  let chargeCount = cp.charges.length
  for (const sub of cp.subs) {
    if (chargeCount >= 6) break
    if (sub.status !== 'ACTIVE') continue
    const plan = cp.plans.find((p) => p.pda === sub.plan)
    if (!plan) continue

    // Charge twice per sub if possible
    const subsCharges = cp.charges.filter((c) => c.subscription === sub.pda).length
    const chargesNeeded = Math.min(2, 6 - chargeCount)
    for (let i = subsCharges; i < subsCharges + chargesNeeded; i++) {
      if (chargeCount >= 6) break
      try {
        const tx = await chargeSubscription(program, deployer, sub, plan, cp)
        cp.charges.push({ subscription: sub.pda, tx })
        chargeCount++
        saveCheckpoint(cp)
      } catch (e: any) {
        console.error(`  [error] charge: ${e.message?.slice(0, 100)}`)
        break // If charge fails (not due yet), skip remaining for this sub
      }
      await delay(DELAY_MS)
    }
  }

  // Phase 8: Pause 1 subscription
  console.log('\n=== Phase 8: Pause Subscription (1 tx) ===')
  if (cp.pauses.length === 0 && cp.subs.length >= 2) {
    const subToPause = cp.subs.find((s) => s.status === 'ACTIVE')
    if (subToPause) {
      const plan = cp.plans.find((p) => p.pda === subToPause.plan)
      if (plan) {
        try {
          const tx = await pauseSubscription(program, subToPause, plan)
          subToPause.status = 'PAUSED'
          cp.pauses.push({ subscription: subToPause.pda, tx })
          saveCheckpoint(cp)
        } catch (e: any) {
          console.error(`  [error] pause: ${e.message?.slice(0, 100)}`)
        }
      }
    }
  } else {
    console.log('  [skip] already paused')
  }

  // Phase 9: Cancel 1 subscription
  console.log('\n=== Phase 9: Cancel Subscription (1 tx) ===')
  if (cp.cancels.length === 0 && cp.subs.length >= 3) {
    // Cancel a different sub than the one we paused
    const subToCancel = cp.subs.find(
      (s) => s.status === 'ACTIVE' && !cp.pauses.find((p) => p.subscription === s.pda),
    )
    if (subToCancel) {
      const plan = cp.plans.find((p) => p.pda === subToCancel.plan)
      if (plan) {
        try {
          const tx = await cancelSubscription(program, subToCancel, plan)
          subToCancel.status = 'CANCELED'
          cp.cancels.push({ subscription: subToCancel.pda, tx })
          saveCheckpoint(cp)
        } catch (e: any) {
          console.error(`  [error] cancel: ${e.message?.slice(0, 100)}`)
        }
      }
    }
  } else {
    console.log('  [skip] already canceled')
  }

  // Summary
  const totalTxs =
    Object.keys(cp.merchants).length +
    cp.invoices.length +
    cp.invoices.filter((i) => i.status === 'PAID').length +
    cp.voids.length +
    cp.plans.length +
    cp.subs.length +
    cp.charges.length +
    cp.pauses.length +
    cp.cancels.length

  console.log('\n' + '='.repeat(60))
  console.log('SEED COMPLETE')
  console.log('='.repeat(60))
  console.log(`  Merchants:     ${Object.keys(cp.merchants).length}`)
  console.log(`  Invoices:      ${cp.invoices.length}`)
  console.log(`  Paid:          ${cp.invoices.filter((i) => i.status === 'PAID').length}`)
  console.log(`  Voided:        ${cp.voids.length}`)
  console.log(`  Plans:         ${cp.plans.length}`)
  console.log(`  Subscriptions: ${cp.subs.length}`)
  console.log(`  Charges:       ${cp.charges.length}`)
  console.log(`  Pauses:        ${cp.pauses.length}`)
  console.log(`  Cancels:       ${cp.cancels.length}`)
  console.log(`  ────────────────────────────`)
  console.log(`  TOTAL TXS:     ${totalTxs}`)
  console.log(`\nCheckpoint saved to: ${CHECKPOINT_PATH}`)
  console.log(`\nView on Solscan:`)
  console.log(`  https://solscan.io/account/${PROGRAM_ID.toBase58()}?cluster=devnet`)
}

main().catch((e) => {
  console.error('\nFATAL:', e)
  process.exit(1)
})

