import { PublicKey } from '@solana/web3.js'
import { keccak_256 } from '@noble/hashes/sha3'

export interface CommitmentInput {
  /** Amount in smallest unit (e.g. 99 USDC = 99_000_000n) */
  amount: bigint
  /** Mint address */
  mint: PublicKey
  /** 32-byte nonce. Generate with `generateNonce()` */
  nonce: Uint8Array
}

/**
 * Computes the canonical commitment hash for a confidential invoice.
 * MUST match the on-chain `compute_commitment` Rust function exactly.
 *
 * Layout: keccak256( amount_le_u64 || mint_bytes || nonce )
 */
export function computeCommitment({ amount, mint, nonce }: CommitmentInput): Uint8Array {
  if (nonce.length !== 32) {
    throw new Error(`Nonce must be 32 bytes, got ${nonce.length}`)
  }
  if (amount < 0n || amount > 0xFFFFFFFFFFFFFFFFn) {
    throw new Error(`Amount must fit in u64`)
  }

  const amountBytes = new Uint8Array(8)
  const view = new DataView(amountBytes.buffer)
  view.setBigUint64(0, amount, true) // little-endian, matching Rust to_le_bytes()

  const mintBytes = mint.toBytes()

  const buf = new Uint8Array(8 + 32 + 32)
  buf.set(amountBytes, 0)
  buf.set(mintBytes, 8)
  buf.set(nonce, 40)

  return keccak_256(buf)
}

/**
 * Verifies that revealed invoice data matches an on-chain commitment hash.
 * Used for selective disclosure: a customer can prove they paid a specific
 * amount by revealing the cleartext values (amount, mint, nonce) and calling
 * this function to check they produce the given commitment.
 *
 * @returns true if the revealed values match the commitment hash
 */
export function verifyCommitment(
  input: CommitmentInput,
  expectedHash: Uint8Array
): boolean {
  if (expectedHash.length !== 32) {
    throw new Error(`Expected hash must be 32 bytes, got ${expectedHash.length}`)
  }
  const computed = computeCommitment(input)
  // Constant-time comparison to prevent timing attacks
  if (computed.length !== expectedHash.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) {
    diff |= computed[i] ^ expectedHash[i]
  }
  return diff === 0
}

/**
 * Generate a cryptographically random 32-byte nonce for the commitment.
 */
export function generateNonce(): Uint8Array {
  const buf = new Uint8Array(32)
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(buf)
  } else {
    // Node.js fallback
    const { randomBytes } = require('node:crypto')
    const nodeBuf = randomBytes(32)
    buf.set(new Uint8Array(nodeBuf.buffer, nodeBuf.byteOffset, nodeBuf.byteLength))
  }
  return buf
}
