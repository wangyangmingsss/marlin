import { PublicKey } from '@solana/web3.js'

export function deriveMerchantPda(authority: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('merchant'), authority.toBuffer()],
    programId,
  )
}

export function deriveInvoicePda(
  merchant: PublicKey,
  invoiceIdBytes: Uint8Array,
  programId: PublicKey,
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('invoice'), merchant.toBuffer(), Buffer.from(invoiceIdBytes)],
    programId,
  )
}

export function derivePlanPda(
  merchant: PublicKey,
  planIdBytes: Uint8Array,
  programId: PublicKey,
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('plan'), merchant.toBuffer(), Buffer.from(planIdBytes)],
    programId,
  )
}

export function deriveSubscriptionPda(
  plan: PublicKey,
  customer: PublicKey,
  programId: PublicKey,
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('sub'), plan.toBuffer(), customer.toBuffer()],
    programId,
  )
}
