#!/usr/bin/env tsx
/**
 * Generates 30+ real devnet transactions covering the full Marlin lifecycle.
 * Uses raw @solana/web3.js instructions (no Anchor Program class needed).
 *
 * Idempotent: writes a checkpoint to .marlin-seed-state.json.
 * Safe to re-run: skips already-completed operations.
 */
import {
  Connection, Keypair, PublicKey, SystemProgram,
  Transaction, TransactionInstruction, sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'
import { createHash, randomBytes } from 'crypto'
import { BN } from 'bn.js'

// ── Config ───────────────────────────────────────────────────
const RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const PROGRAM_ID = new PublicKey(process.env.MARLIN_PROGRAM_ID_DEVNET || 'MRLNxMrRgKMFnHEuJPsWnbDzDRKdNHvisijd7Gg6MjZ')
const STATE_FILE = '.marlin-seed-state.json'

// Load env
const envContent = fs.readFileSync('.env', 'utf-8')
function envGet(key: string): string {
  const m = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return m?.[1] || ''
}

const PYUSD = new PublicKey(envGet('PYUSD_MINT_DEVNET'))
const USDG = new PublicKey(envGet('USDG_MINT_DEVNET'))
const USDC = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
const PROTOCOL_FEE_RECEIVER = new PublicKey(envGet('DEPLOYER_PUBKEY') || 'Ff4ewV5s2MqaxBHycsgRdHBy2EyC1vPLLWBW9M7HZVnr')
const KEYPAIR_PATH = process.env.DEPLOYER_KEYPAIR_PATH || `${process.env.HOME}/.marlin/deployer.json`

// ── State (checkpoint) ───────────────────────────────────────
type State = {
  merchants: Record<string, { authority: string; pda: string; tx: string }>
  invoices: Array<{ merchant: string; pda: string; mint: string; amount: string; status: string; tx: string; desc: string }>
  payments: Array<{ invoicePda: string; payer: string; tx: string }>
  voids: Array<{ invoicePda: string; tx: string }>
  plans: Array<{ merchant: string; pda: string; tx: string }>
  subs: Array<{ plan: string; customer: string; pda: string; tx: string }>
  charges: Array<{ subscription: string; tx: string }>
}
const loadState = (): State =>
  fs.existsSync(STATE_FILE)
    ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
    : { merchants: {}, invoices: [], payments: [], voids: [], plans: [], subs: [], charges: [] }
const saveState = (s: State) =>
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2))

// ── Discriminator helper ─────────────────────────────────────
function discriminator(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().slice(0, 8)
}

// ── PDA helpers ──────────────────────────────────────────────
const merchantPda = (auth: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from('merchant'), auth.toBuffer()], PROGRAM_ID)[0]

const invoicePda = (merchant: PublicKey, invoiceId: Buffer) =>
  PublicKey.findProgramAddressSync([Buffer.from('invoice'), merchant.toBuffer(), invoiceId], PROGRAM_ID)[0]

const planPda = (merchant: PublicKey, planId: Buffer) =>
  PublicKey.findProgramAddressSync([Buffer.from('plan'), merchant.toBuffer(), planId], PROGRAM_ID)[0]

const subPda = (plan: PublicKey, customer: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from('sub'), plan.toBuffer(), customer.toBuffer()], PROGRAM_ID)[0]

// ── Borsh encoding helpers ───────────────────────────────────
function encodeU8Array(arr: Buffer | Uint8Array, len: number): Buffer {
  const buf = Buffer.alloc(len)
  Buffer.from(arr).copy(buf, 0, 0, Math.min(arr.length, len))
  return buf
}

function encodeU64(n: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(n)
  return buf
}

function encodeI64(n: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigInt64LE(n)
  return buf
}

function encodePubkey(pk: PublicKey): Buffer {
  return pk.toBuffer()
}

function encodeU32(n: number): Buffer {
  const buf = Buffer.alloc(4)
  buf.writeUInt32LE(n)
  return buf
}

// ── Instruction builders ─────────────────────────────────────
function buildInitializeMerchantIx(
  authority: PublicKey,
  merchantPdaPk: PublicKey,
  merchantId: Buffer,
  displayName: Buffer,
  defaultSettlementMint: PublicKey,
): TransactionInstruction {
  const data = Buffer.concat([
    discriminator('initialize_merchant'),
    encodeU8Array(merchantId, 16),
    encodeU8Array(displayName, 64),
    encodePubkey(defaultSettlementMint),
  ])

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: merchantPdaPk, isSigner: false, isWritable: true },
      { pubkey: defaultSettlementMint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

function buildCreateInvoiceIx(
  authority: PublicKey,
  merchantPdaPk: PublicKey,
  invoicePdaPk: PublicKey,
  invoiceId: Buffer,
  customerWallet: PublicKey,
  amount: bigint,
  mint: PublicKey,
  dueAt: bigint,
  memoHash: Buffer,
): TransactionInstruction {
  const data = Buffer.concat([
    discriminator('create_invoice'),
    encodeU8Array(invoiceId, 16),
    encodePubkey(customerWallet),
    encodeU64(amount),
    encodePubkey(mint),
    encodeI64(dueAt),
    encodeU8Array(memoHash, 32),
  ])

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: merchantPdaPk, isSigner: false, isWritable: true },
      { pubkey: invoicePdaPk, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

function buildPayInvoiceIx(
  payer: PublicKey,
  merchantPdaPk: PublicKey,
  invoicePdaPk: PublicKey,
  mint: PublicKey,
  payerTokenAccount: PublicKey,
  merchantTokenAccount: PublicKey,
  merchantAuthority: PublicKey,
  protocolFeeReceiver: PublicKey,
  protocolFeeTokenAccount: PublicKey,
): TransactionInstruction {
  const data = discriminator('pay_invoice')

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: merchantPdaPk, isSigner: false, isWritable: true },
      { pubkey: invoicePdaPk, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: payerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: merchantTokenAccount, isSigner: false, isWritable: true },
      { pubkey: merchantAuthority, isSigner: false, isWritable: false },
      { pubkey: protocolFeeReceiver, isSigner: false, isWritable: false },
      { pubkey: protocolFeeTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

function buildVoidInvoiceIx(
  authority: PublicKey,
  merchantPdaPk: PublicKey,
  invoicePdaPk: PublicKey,
): TransactionInstruction {
  const data = discriminator('void_invoice')

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: merchantPdaPk, isSigner: false, isWritable: false },
      { pubkey: invoicePdaPk, isSigner: false, isWritable: true },
    ],
    data,
  })
}

function buildCreateSubscriptionPlanIx(
  authority: PublicKey,
  merchantPdaPk: PublicKey,
  planPdaPk: PublicKey,
  planId: Buffer,
  name: Buffer,
  amountPerPeriod: bigint,
  mint: PublicKey,
  periodSeconds: number,
  trialSeconds: number,
): TransactionInstruction {
  const data = Buffer.concat([
    discriminator('create_subscription_plan'),
    encodeU8Array(planId, 16),
    encodeU8Array(name, 64),
    encodeU64(amountPerPeriod),
    encodePubkey(mint),
    encodeU32(periodSeconds),
    encodeU32(trialSeconds),
  ])

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: merchantPdaPk, isSigner: false, isWritable: false },
      { pubkey: planPdaPk, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

function buildSubscribeIx(
  customer: PublicKey,
  plan: PublicKey,
  merchantPdaPk: PublicKey,
  subscriptionPda: PublicKey,
  customerTokenAccount: PublicKey,
  maxTotalAuthorized: bigint,
): TransactionInstruction {
  const data = Buffer.concat([
    discriminator('subscribe'),
    encodeU64(maxTotalAuthorized),
  ])

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: customer, isSigner: true, isWritable: true },
      { pubkey: merchantPdaPk, isSigner: false, isWritable: false },
      { pubkey: plan, isSigner: false, isWritable: false },
      { pubkey: subscriptionPda, isSigner: false, isWritable: true },
      { pubkey: customerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
}

// ── Setup ────────────────────────────────────────────────────
function loadKp(p: string) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, 'utf-8'))))
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  const conn = new Connection(RPC, 'confirmed')
  const deployer = loadKp(KEYPAIR_PATH)
  const state = loadState()

  console.log(`Program ID: ${PROGRAM_ID.toBase58()}`)
  console.log(`RPC: ${RPC}`)
  console.log(`Deployer: ${deployer.publicKey.toBase58()}`)

  // Check if program exists on chain
  const programInfo = await conn.getAccountInfo(PROGRAM_ID)
  if (!programInfo) {
    console.error('❌ Program not found on devnet. Deploy the program first.')
    console.error('   Use: anchor deploy --provider.cluster https://api.devnet.solana.com')
    process.exit(1)
  }
  console.log('✅ Program found on devnet')

  // Load personas
  if (!fs.existsSync('.marlin-personas.json')) {
    console.error('❌ Run agent-create-personas.ts first')
    process.exit(1)
  }
  const personas = JSON.parse(fs.readFileSync('.marlin-personas.json', 'utf-8'))

  // ── Phase 1: Initialize merchants ──
  console.log('\n═══ Phase 1: Initialize merchants ═══')
  const merchantNames: Record<string, string> = {
    'acme-coffee': 'Acme Coffee Shop',
    'taylor-design': 'Taylor Design Studio',
    'devops-co': 'DevOps Co',
    'newsletter-pro': 'Newsletter Pro',
    'depin-op': 'DePIN Operator',
  }

  for (const [pName, displayName] of Object.entries(merchantNames)) {
    if (state.merchants[pName]) {
      console.log(`⏭  ${pName} (already initialized)`)
      continue
    }
    const auth = loadKp(`.marlin-personas/${pName}.json`)
    const pda = merchantPda(auth.publicKey)
    const merchantId = randomBytes(16)

    const nameBuf = Buffer.alloc(64)
    nameBuf.write(displayName, 'utf-8')

    try {
      const ix = buildInitializeMerchantIx(
        auth.publicKey, pda, merchantId, nameBuf, PYUSD
      )
      const tx = new Transaction().add(ix)
      const sig = await sendAndConfirmTransaction(conn, tx, [auth])

      state.merchants[pName] = {
        authority: auth.publicKey.toBase58(),
        pda: pda.toBase58(),
        tx: sig,
      }
      saveState(state)
      console.log(`✅ ${pName}: ${sig}`)
      await sleep(500)
    } catch (e: any) {
      // If the merchant PDA already exists (re-run)
      const account = await conn.getAccountInfo(pda)
      if (account) {
        state.merchants[pName] = {
          authority: auth.publicKey.toBase58(),
          pda: pda.toBase58(),
          tx: 'pre-existing',
        }
        saveState(state)
        console.log(`⏭  ${pName} (PDA already exists on chain)`)
      } else {
        console.log(`❌ ${pName}: ${e.message?.slice(0, 120)}`)
      }
    }
  }

  // ── Phase 2: Create invoices ──
  console.log('\n═══ Phase 2: Create invoices ═══')
  const invoiceSpecs = [
    { merchant: 'acme-coffee',    mint: PYUSD, amount: 4_500000n,    desc: 'Espresso machine' },
    { merchant: 'acme-coffee',    mint: PYUSD, amount: 12_000000n,   desc: 'Coffee bean order' },
    { merchant: 'acme-coffee',    mint: PYUSD, amount: 25_000000n,   desc: 'Catering event' },
    { merchant: 'taylor-design',  mint: PYUSD, amount: 850_000000n,  desc: 'Logo design' },
    { merchant: 'taylor-design',  mint: PYUSD, amount: 2400_000000n, desc: 'Website redesign' },
    { merchant: 'taylor-design',  mint: USDG,  amount: 1200_000000n, desc: 'Email templates' },
    { merchant: 'devops-co',      mint: PYUSD, amount: 199_000000n,  desc: 'CI pipeline audit' },
    { merchant: 'devops-co',      mint: PYUSD, amount: 350_000000n,  desc: 'K8s consulting' },
    { merchant: 'devops-co',      mint: USDG,  amount: 500_000000n,  desc: 'On-call setup' },
    { merchant: 'newsletter-pro', mint: PYUSD, amount: 9_900000n,    desc: 'Pro plan May' },
    { merchant: 'newsletter-pro', mint: PYUSD, amount: 9_900000n,    desc: 'Pro plan June' },
    { merchant: 'newsletter-pro', mint: PYUSD, amount: 199_000000n,  desc: 'Annual sponsor' },
    { merchant: 'depin-op',       mint: PYUSD, amount: 1500_000000n, desc: 'Node billing May' },
    { merchant: 'depin-op',       mint: USDG,  amount: 850_000000n,  desc: 'Storage upgrade' },
    { merchant: 'depin-op',       mint: USDG,  amount: 320_000000n,  desc: 'Bandwidth overage' },
  ]

  if (state.invoices.length < invoiceSpecs.length) {
    for (const spec of invoiceSpecs.slice(state.invoices.length)) {
      if (!state.merchants[spec.merchant]) {
        console.log(`❌ Skipping invoice for ${spec.merchant}: merchant not initialized`)
        continue
      }
      const auth = loadKp(`.marlin-personas/${spec.merchant}.json`)
      const merchantPdaPk = new PublicKey(state.merchants[spec.merchant].pda)
      const id = randomBytes(16)
      const pda = invoicePda(merchantPdaPk, id)
      const memoHash = createHash('sha256').update(spec.desc).digest()

      try {
        const ix = buildCreateInvoiceIx(
          auth.publicKey, merchantPdaPk, pda,
          id, PublicKey.default, spec.amount, spec.mint, 0n, memoHash
        )
        const tx = new Transaction().add(ix)
        const sig = await sendAndConfirmTransaction(conn, tx, [auth])

        state.invoices.push({
          merchant: spec.merchant,
          pda: pda.toBase58(),
          mint: spec.mint.toBase58(),
          amount: spec.amount.toString(),
          status: 'OPEN',
          tx: sig,
          desc: spec.desc,
        })
        saveState(state)
        console.log(`✅ invoice "${spec.desc}": ${sig}`)
        await sleep(500)
      } catch (e: any) {
        console.log(`❌ ${spec.desc}: ${e.message?.slice(0, 120)}`)
      }
    }
  } else {
    console.log(`⏭  ${state.invoices.length} invoices already created`)
  }

  // ── Phase 3: Pay invoices ──
  console.log('\n═══ Phase 3: Pay invoices ═══')
  const customers = ['cust-alice', 'cust-bob', 'cust-carol', 'cust-dave', 'cust-eve']
  const targetPaid = 10

  if (state.payments.length < targetPaid) {
    const unpaid = state.invoices.filter(
      (i) => i.status === 'OPEN' && !state.payments.find((p) => p.invoicePda === i.pda)
    ).slice(0, targetPaid - state.payments.length)

    for (let idx = 0; idx < unpaid.length; idx++) {
      const inv = unpaid[idx]
      const customerName = customers[idx % customers.length]
      const customer = loadKp(`.marlin-personas/${customerName}.json`)
      const mintPk = new PublicKey(inv.mint)
      const merchantAuth = new PublicKey(state.merchants[inv.merchant].authority)
      const merchantPdaPk = new PublicKey(state.merchants[inv.merchant].pda)

      const payerAta = getAssociatedTokenAddressSync(mintPk, customer.publicKey)
      const merchantAta = getAssociatedTokenAddressSync(mintPk, merchantAuth)
      const feeAta = getAssociatedTokenAddressSync(mintPk, PROTOCOL_FEE_RECEIVER)

      try {
        // Ensure ATAs exist
        const preIxs: TransactionInstruction[] = []
        preIxs.push(createAssociatedTokenAccountIdempotentInstruction(
          customer.publicKey, merchantAta, merchantAuth, mintPk
        ))
        preIxs.push(createAssociatedTokenAccountIdempotentInstruction(
          customer.publicKey, feeAta, PROTOCOL_FEE_RECEIVER, mintPk
        ))

        const payIx = buildPayInvoiceIx(
          customer.publicKey, merchantPdaPk, new PublicKey(inv.pda),
          mintPk, payerAta, merchantAta, merchantAuth,
          PROTOCOL_FEE_RECEIVER, feeAta
        )
        const tx = new Transaction()
        preIxs.forEach(ix => tx.add(ix))
        tx.add(payIx)
        const sig = await sendAndConfirmTransaction(conn, tx, [customer])

        state.payments.push({ invoicePda: inv.pda, payer: customerName, tx: sig })
        inv.status = 'PAID'
        saveState(state)
        console.log(`✅ ${customerName} paid "${inv.desc || inv.pda.slice(0, 8)}": ${sig}`)
        await sleep(500)
      } catch (e: any) {
        console.log(`❌ pay ${inv.pda.slice(0, 8)}: ${e.message?.slice(0, 120)}`)
      }
    }
  } else {
    console.log(`⏭  ${state.payments.length} payments already processed`)
  }

  // ── Phase 4: Void invoices ──
  console.log('\n═══ Phase 4: Void invoices ═══')
  if (state.voids.length < 2) {
    const toVoid = state.invoices
      .filter((i) => i.status === 'OPEN' && !state.voids.find(v => v.invoicePda === i.pda))
      .slice(0, 2 - state.voids.length)

    for (const inv of toVoid) {
      const auth = loadKp(`.marlin-personas/${inv.merchant}.json`)
      const merchantPdaPk = new PublicKey(state.merchants[inv.merchant].pda)
      try {
        const ix = buildVoidInvoiceIx(auth.publicKey, merchantPdaPk, new PublicKey(inv.pda))
        const tx = new Transaction().add(ix)
        const sig = await sendAndConfirmTransaction(conn, tx, [auth])

        state.voids.push({ invoicePda: inv.pda, tx: sig })
        inv.status = 'VOID'
        saveState(state)
        console.log(`✅ void "${inv.desc || inv.pda.slice(0, 8)}": ${sig}`)
        await sleep(500)
      } catch (e: any) {
        console.log(`❌ void: ${e.message?.slice(0, 120)}`)
      }
    }
  }

  // ── Phase 5: Create subscription plans ──
  console.log('\n═══ Phase 5: Create subscription plans ═══')
  const planSpecs = [
    { merchant: 'newsletter-pro', name: 'Pro Monthly', amount: 9_900000n, mint: PYUSD, period: 2592000, trial: 604800 },
    { merchant: 'devops-co', name: 'DevOps SaaS Monthly', amount: 99_000000n, mint: PYUSD, period: 2592000, trial: 0 },
    { merchant: 'depin-op', name: 'Node Operator Monthly', amount: 149_000000n, mint: PYUSD, period: 2592000, trial: 0 },
  ]

  if (state.plans.length < planSpecs.length) {
    for (const spec of planSpecs.slice(state.plans.length)) {
      if (!state.merchants[spec.merchant]) continue
      const auth = loadKp(`.marlin-personas/${spec.merchant}.json`)
      const merchantPdaPk = new PublicKey(state.merchants[spec.merchant].pda)
      const planId = randomBytes(16)
      const pda = planPda(merchantPdaPk, planId)
      const nameBuf = Buffer.alloc(64)
      nameBuf.write(spec.name, 'utf-8')

      try {
        const ix = buildCreateSubscriptionPlanIx(
          auth.publicKey, merchantPdaPk, pda,
          planId, nameBuf, spec.amount, spec.mint, spec.period, spec.trial
        )
        const tx = new Transaction().add(ix)
        const sig = await sendAndConfirmTransaction(conn, tx, [auth])

        state.plans.push({ merchant: spec.merchant, pda: pda.toBase58(), tx: sig })
        saveState(state)
        console.log(`✅ plan "${spec.name}": ${sig}`)
        await sleep(500)
      } catch (e: any) {
        console.log(`❌ plan "${spec.name}": ${e.message?.slice(0, 120)}`)
      }
    }
  } else {
    console.log(`⏭  ${state.plans.length} plans already created`)
  }

  // ── Phase 6: Subscribe customers ──
  console.log('\n═══ Phase 6: Subscribe customers ═══')
  if (state.subs.length < state.plans.length && state.plans.length > 0) {
    const subSpecs = [
      { plan: 0, customer: 'cust-alice', maxAuth: 99_000000n },
      { plan: 1, customer: 'cust-bob', maxAuth: 990_000000n },
      { plan: 2, customer: 'cust-carol', maxAuth: 1490_000000n },
    ]
    for (const spec of subSpecs.slice(state.subs.length)) {
      if (spec.plan >= state.plans.length) continue
      const planInfo = state.plans[spec.plan]
      const planPk = new PublicKey(planInfo.pda)
      const customer = loadKp(`.marlin-personas/${spec.customer}.json`)
      const merchantPdaPk = new PublicKey(state.merchants[planInfo.merchant].pda)
      const sub = subPda(planPk, customer.publicKey)
      const customerAta = getAssociatedTokenAddressSync(PYUSD, customer.publicKey)

      try {
        const ix = buildSubscribeIx(
          customer.publicKey, planPk, merchantPdaPk, sub, customerAta, spec.maxAuth
        )
        const tx = new Transaction().add(ix)
        const sig = await sendAndConfirmTransaction(conn, tx, [customer])

        state.subs.push({ plan: planPk.toBase58(), customer: spec.customer, pda: sub.toBase58(), tx: sig })
        saveState(state)
        console.log(`✅ ${spec.customer} subscribed: ${sig}`)
        await sleep(500)
      } catch (e: any) {
        console.log(`❌ subscribe ${spec.customer}: ${e.message?.slice(0, 120)}`)
      }
    }
  }

  // ── Print summary ──
  const totalTxs =
    Object.values(state.merchants).filter((m) => m.tx !== 'pre-existing').length +
    state.invoices.length +
    state.payments.length +
    state.voids.length +
    state.plans.length +
    state.subs.length +
    state.charges.length

  console.log(`\n═══ Summary ═══`)
  console.log(`Merchants: ${Object.keys(state.merchants).length}`)
  console.log(`Invoices: ${state.invoices.length}`)
  console.log(`Payments: ${state.payments.length}`)
  console.log(`Voids: ${state.voids.length}`)
  console.log(`Plans: ${state.plans.length}`)
  console.log(`Subscriptions: ${state.subs.length}`)
  console.log(`Total devnet transactions: ${totalTxs}`)
  console.log(`State saved to ${STATE_FILE}`)
}

main().catch((e) => {
  console.error('❌ Seed failed:', e)
  process.exit(1)
})
