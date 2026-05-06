import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { expect } from 'chai'
import { Marlin } from '../target/types/marlin'

describe('marlin', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Marlin as Program<Marlin>

  // Test keypairs
  const merchantAuthority = Keypair.generate()
  const customerWallet = Keypair.generate()
  const protocolFeeReceiver = new PublicKey('11111111111111111111111111111112')

  // Mint and token accounts
  let mint: PublicKey
  let merchantTokenAccount: PublicKey
  let customerTokenAccount: PublicKey
  let protocolFeeTokenAccount: PublicKey

  // PDAs
  let merchantPda: PublicKey
  let merchantBump: number
  let invoicePda: PublicKey
  let invoiceBump: number
  let planPda: PublicKey
  let planBump: number
  let subscriptionPda: PublicKey
  let subscriptionBump: number

  // IDs
  const merchantId = new Uint8Array(16).fill(1)
  const invoiceId = new Uint8Array(16).fill(2)
  const planId = new Uint8Array(16).fill(3)

  function padName(name: string): number[] {
    const bytes = Buffer.alloc(64)
    bytes.write(name, 'utf8')
    return Array.from(bytes)
  }

  before(async () => {
    // Airdrop SOL to test wallets
    await provider.connection.requestAirdrop(
      merchantAuthority.publicKey,
      10 * LAMPORTS_PER_SOL,
    )
    await provider.connection.requestAirdrop(
      customerWallet.publicKey,
      10 * LAMPORTS_PER_SOL,
    )

    // Wait for confirmation
    await new Promise((r) => setTimeout(r, 1000))

    // Create test mint (simulating USDC)
    mint = await createMint(
      provider.connection,
      merchantAuthority,
      merchantAuthority.publicKey,
      null,
      6,
    )

    // Create token accounts
    customerTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      customerWallet,
      mint,
      customerWallet.publicKey,
    )

    // Mint tokens to customer
    await mintTo(
      provider.connection,
      merchantAuthority,
      mint,
      customerTokenAccount,
      merchantAuthority.publicKey,
      1_000_000_000, // 1000 USDC
    )

    // Derive PDAs
    ;[merchantPda, merchantBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('merchant'), merchantAuthority.publicKey.toBuffer()],
      program.programId,
    )
    ;[invoicePda, invoiceBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('invoice'), merchantPda.toBuffer(), Buffer.from(invoiceId)],
      program.programId,
    )
    ;[planPda, planBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('plan'), merchantPda.toBuffer(), Buffer.from(planId)],
      program.programId,
    )
    ;[subscriptionPda, subscriptionBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('sub'), planPda.toBuffer(), customerWallet.publicKey.toBuffer()],
      program.programId,
    )
  })

  // ─── Instruction 1: Initialize Merchant ───────────────────────────

  describe('initialize_merchant', () => {
    it('creates merchant PDA with correct data', async () => {
      const displayName = padName('Test Coffee Shop')

      await program.methods
        .initializeMerchant(
          Array.from(merchantId),
          displayName,
          mint,
        )
        .accounts({
          authority: merchantAuthority.publicKey,
          merchant: merchantPda,
          settlementMint: mint,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchantAuthority])
        .rpc()

      const merchantAccount = await program.account.merchant.fetch(merchantPda)
      expect(merchantAccount.authority.toBase58()).to.equal(
        merchantAuthority.publicKey.toBase58(),
      )
      expect(merchantAccount.totalVolume.toNumber()).to.equal(0)
      expect(merchantAccount.bump).to.equal(merchantBump)
    })

    it('rejects empty display name', async () => {
      const emptyName = new Array(64).fill(0)
      const auth2 = Keypair.generate()
      await provider.connection.requestAirdrop(auth2.publicKey, 2 * LAMPORTS_PER_SOL)
      await new Promise((r) => setTimeout(r, 500))

      const [pda2] = PublicKey.findProgramAddressSync(
        [Buffer.from('merchant'), auth2.publicKey.toBuffer()],
        program.programId,
      )

      try {
        await program.methods
          .initializeMerchant(Array.from(merchantId), emptyName, mint)
          .accounts({
            authority: auth2.publicKey,
            merchant: pda2,
            settlementMint: mint,
            systemProgram: SystemProgram.programId,
          })
          .signers([auth2])
          .rpc()
        expect.fail('should have thrown')
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal('InvalidDisplayName')
      }
    })
  })

  // ─── Instruction 2: Update Merchant ────────────────────────────────

  describe('update_merchant', () => {
    it('updates display name', async () => {
      const newName = padName('Updated Coffee Shop')

      await program.methods
        .updateMerchant(newName, null)
        .accounts({
          authority: merchantAuthority.publicKey,
          merchant: merchantPda,
        })
        .signers([merchantAuthority])
        .rpc()

      const merchantAccount = await program.account.merchant.fetch(merchantPda)
      const nameStr = Buffer.from(merchantAccount.displayName)
        .toString('utf8')
        .replace(/\0+$/, '')
      expect(nameStr).to.equal('Updated Coffee Shop')
    })

    it('rejects unauthorized signer', async () => {
      const imposter = Keypair.generate()
      await provider.connection.requestAirdrop(imposter.publicKey, LAMPORTS_PER_SOL)
      await new Promise((r) => setTimeout(r, 500))

      try {
        await program.methods
          .updateMerchant(padName('Hacked'), null)
          .accounts({
            authority: imposter.publicKey,
            merchant: merchantPda,
          })
          .signers([imposter])
          .rpc()
        expect.fail('should have thrown')
      } catch (err: any) {
        // Anchor constraint error
        expect(err).to.exist
      }
    })
  })

  // ─── Instruction 3: Create Invoice ─────────────────────────────────

  describe('create_invoice', () => {
    it('creates invoice in Open status', async () => {
      const amount = new anchor.BN(100_000_000) // 100 USDC
      const dueAt = new anchor.BN(0) // no expiry
      const memoHash = new Uint8Array(32).fill(0xab)

      await program.methods
        .createInvoice(
          Array.from(invoiceId),
          customerWallet.publicKey,
          amount,
          mint,
          dueAt,
          Array.from(memoHash),
        )
        .accounts({
          authority: merchantAuthority.publicKey,
          merchant: merchantPda,
          invoice: invoicePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchantAuthority])
        .rpc()

      const invoiceAccount = await program.account.invoice.fetch(invoicePda)
      expect(invoiceAccount.amount.toNumber()).to.equal(100_000_000)
      expect(invoiceAccount.status).to.equal(0) // Open
      expect(invoiceAccount.merchant.toBase58()).to.equal(merchantPda.toBase58())
    })

    it('rejects zero amount', async () => {
      const badInvoiceId = new Uint8Array(16).fill(99)
      const [badInvoicePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('invoice'), merchantPda.toBuffer(), Buffer.from(badInvoiceId)],
        program.programId,
      )

      try {
        await program.methods
          .createInvoice(
            Array.from(badInvoiceId),
            customerWallet.publicKey,
            new anchor.BN(0),
            mint,
            new anchor.BN(0),
            Array.from(new Uint8Array(32)),
          )
          .accounts({
            authority: merchantAuthority.publicKey,
            merchant: merchantPda,
            invoice: badInvoicePda,
            systemProgram: SystemProgram.programId,
          })
          .signers([merchantAuthority])
          .rpc()
        expect.fail('should have thrown')
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal('InvalidAmount')
      }
    })
  })

  // ─── Instruction 5: Void Invoice ───────────────────────────────────

  describe('void_invoice', () => {
    let voidInvoicePda: PublicKey

    before(async () => {
      const voidInvoiceId = new Uint8Array(16).fill(10)
      ;[voidInvoicePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('invoice'), merchantPda.toBuffer(), Buffer.from(voidInvoiceId)],
        program.programId,
      )

      await program.methods
        .createInvoice(
          Array.from(voidInvoiceId),
          customerWallet.publicKey,
          new anchor.BN(50_000_000),
          mint,
          new anchor.BN(0),
          Array.from(new Uint8Array(32)),
        )
        .accounts({
          authority: merchantAuthority.publicKey,
          merchant: merchantPda,
          invoice: voidInvoicePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchantAuthority])
        .rpc()
    })

    it('voids an open invoice', async () => {
      await program.methods
        .voidInvoice()
        .accounts({
          authority: merchantAuthority.publicKey,
          merchant: merchantPda,
          invoice: voidInvoicePda,
        })
        .signers([merchantAuthority])
        .rpc()

      const invoiceAccount = await program.account.invoice.fetch(voidInvoicePda)
      expect(invoiceAccount.status).to.equal(2) // Void
    })
  })

  // ─── Instruction 6: Create Subscription Plan ───────────────────────

  describe('create_subscription_plan', () => {
    it('creates plan with correct parameters', async () => {
      const planName = padName('Pro Monthly')
      const amountPerPeriod = new anchor.BN(29_000_000) // 29 USDC
      const periodSeconds = 2_592_000 // 30 days
      const trialSeconds = 604_800 // 7 days

      await program.methods
        .createSubscriptionPlan(
          Array.from(planId),
          planName,
          amountPerPeriod,
          mint,
          periodSeconds,
          trialSeconds,
        )
        .accounts({
          authority: merchantAuthority.publicKey,
          merchant: merchantPda,
          plan: planPda,
          settlementMint: mint,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchantAuthority])
        .rpc()

      const planAccount = await program.account.subscriptionPlan.fetch(planPda)
      expect(planAccount.amountPerPeriod.toNumber()).to.equal(29_000_000)
      expect(planAccount.periodSeconds).to.equal(periodSeconds)
      expect(planAccount.trialSeconds).to.equal(trialSeconds)
      expect(planAccount.active).to.equal(true)
    })

    it('rejects period too short', async () => {
      const shortPlanId = new Uint8Array(16).fill(20)
      const [shortPlanPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('plan'), merchantPda.toBuffer(), Buffer.from(shortPlanId)],
        program.programId,
      )

      try {
        await program.methods
          .createSubscriptionPlan(
            Array.from(shortPlanId),
            padName('Bad Plan'),
            new anchor.BN(1000),
            mint,
            100, // too short
            0,
          )
          .accounts({
            authority: merchantAuthority.publicKey,
            merchant: merchantPda,
            plan: shortPlanPda,
            settlementMint: mint,
            systemProgram: SystemProgram.programId,
          })
          .signers([merchantAuthority])
          .rpc()
        expect.fail('should have thrown')
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal('PeriodTooShort')
      }
    })
  })

  // ─── Instruction 7: Set Plan Active ────────────────────────────────

  describe('set_plan_active', () => {
    it('deactivates a plan', async () => {
      await program.methods
        .setPlanActive(false)
        .accounts({
          authority: merchantAuthority.publicKey,
          merchant: merchantPda,
          plan: planPda,
        })
        .signers([merchantAuthority])
        .rpc()

      const planAccount = await program.account.subscriptionPlan.fetch(planPda)
      expect(planAccount.active).to.equal(false)
    })

    it('reactivates a plan', async () => {
      await program.methods
        .setPlanActive(true)
        .accounts({
          authority: merchantAuthority.publicKey,
          merchant: merchantPda,
          plan: planPda,
        })
        .signers([merchantAuthority])
        .rpc()

      const planAccount = await program.account.subscriptionPlan.fetch(planPda)
      expect(planAccount.active).to.equal(true)
    })
  })

  // ─── Instruction 8: Subscribe ──────────────────────────────────────

  describe('subscribe', () => {
    it('creates subscription with delegation', async () => {
      const maxAuthorized = new anchor.BN(290_000_000) // 10 periods worth

      await program.methods
        .subscribe(maxAuthorized)
        .accounts({
          customer: customerWallet.publicKey,
          merchant: merchantPda,
          plan: planPda,
          subscription: subscriptionPda,
          customerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([customerWallet])
        .rpc()

      const subAccount = await program.account.subscription.fetch(subscriptionPda)
      expect(subAccount.customer.toBase58()).to.equal(customerWallet.publicKey.toBase58())
      expect(subAccount.plan.toBase58()).to.equal(planPda.toBase58())
      expect(subAccount.chargesCount).to.equal(0)
      expect(subAccount.totalCharged.toNumber()).to.equal(0)
      expect(subAccount.maxTotalAuthorized.toNumber()).to.equal(290_000_000)
      expect(subAccount.status).to.equal(0) // Active
    })

    it('rejects insufficient authorization', async () => {
      const customer2 = Keypair.generate()
      await provider.connection.requestAirdrop(customer2.publicKey, 2 * LAMPORTS_PER_SOL)
      await new Promise((r) => setTimeout(r, 500))

      const customer2Token = await createAssociatedTokenAccount(
        provider.connection,
        customer2,
        mint,
        customer2.publicKey,
      )

      const [sub2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('sub'), planPda.toBuffer(), customer2.publicKey.toBuffer()],
        program.programId,
      )

      try {
        await program.methods
          .subscribe(new anchor.BN(1000)) // less than amount_per_period
          .accounts({
            customer: customer2.publicKey,
            merchant: merchantPda,
            plan: planPda,
            subscription: sub2Pda,
            customerTokenAccount: customer2Token,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([customer2])
          .rpc()
        expect.fail('should have thrown')
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal('InsufficientAuthorization')
      }
    })
  })

  // ─── Instruction 10: Pause Subscription ────────────────────────────

  describe('pause_subscription', () => {
    it('pauses an active subscription', async () => {
      await program.methods
        .pauseSubscription()
        .accounts({
          authority: customerWallet.publicKey,
          subscription: subscriptionPda,
          plan: planPda,
          merchant: merchantPda,
        })
        .signers([customerWallet])
        .rpc()

      const subAccount = await program.account.subscription.fetch(subscriptionPda)
      expect(subAccount.status).to.equal(1) // Paused
    })
  })

  // ─── Instruction 11: Resume Subscription ───────────────────────────

  describe('resume_subscription', () => {
    it('resumes a paused subscription', async () => {
      await program.methods
        .resumeSubscription()
        .accounts({
          authority: customerWallet.publicKey,
          subscription: subscriptionPda,
          plan: planPda,
          merchant: merchantPda,
        })
        .signers([customerWallet])
        .rpc()

      const subAccount = await program.account.subscription.fetch(subscriptionPda)
      expect(subAccount.status).to.equal(0) // Active
    })
  })

  // ─── Instruction 13: Update Subscription Authorization ─────────────

  describe('update_subscription_authorization', () => {
    it('increases max authorized amount', async () => {
      const newMax = new anchor.BN(500_000_000) // 500 USDC

      await program.methods
        .updateSubscriptionAuthorization(newMax)
        .accounts({
          customer: customerWallet.publicKey,
          subscription: subscriptionPda,
          customerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([customerWallet])
        .rpc()

      const subAccount = await program.account.subscription.fetch(subscriptionPda)
      expect(subAccount.maxTotalAuthorized.toNumber()).to.equal(500_000_000)
    })
  })

  // ─── Instruction 12: Cancel Subscription ───────────────────────────

  describe('cancel_subscription', () => {
    it('cancels an active subscription', async () => {
      await program.methods
        .cancelSubscription()
        .accounts({
          authority: customerWallet.publicKey,
          subscription: subscriptionPda,
          plan: planPda,
          merchant: merchantPda,
          customerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([customerWallet])
        .rpc()

      const subAccount = await program.account.subscription.fetch(subscriptionPda)
      expect(subAccount.status).to.equal(2) // Canceled
    })
  })
})
