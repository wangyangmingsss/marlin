import { PublicKey } from '@solana/web3.js'

/**
 * Derives the PDA for a merchant account.
 * Seeds: ["merchant", authority]
 * @param authority - The wallet public key of the merchant owner
 * @param programId - The Marlin program ID
 * @returns A tuple of [PublicKey, bump] for the merchant PDA
 */
export function deriveMerchantPda(authority: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('merchant'), authority.toBuffer()],
    programId,
  )
}

/**
 * Derives the PDA for an invoice account.
 * Seeds: ["invoice", merchant, invoiceId]
 * @param merchant - The merchant account public key
 * @param invoiceIdBytes - The unique invoice identifier as bytes
 * @param programId - The Marlin program ID
 * @returns A tuple of [PublicKey, bump] for the invoice PDA
 */
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

/**
 * Derives the PDA for a subscription plan account.
 * Seeds: ["plan", merchant, planId]
 * @param merchant - The merchant account public key
 * @param planIdBytes - The unique plan identifier as bytes
 * @param programId - The Marlin program ID
 * @returns A tuple of [PublicKey, bump] for the plan PDA
 */
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

/**
 * Derives the PDA for a subscription account.
 * Seeds: ["sub", plan, customer]
 * @param plan - The plan account public key
 * @param customer - The customer wallet public key
 * @param programId - The Marlin program ID
 * @returns A tuple of [PublicKey, bump] for the subscription PDA
 */
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
