import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64 } from 'tweetnacl-util'

export interface InvoicePayload {
  /** Amount as string (bigint serialized) */
  amount: string
  /** Mint address (base58) */
  mintAddress: string
  /** Human-readable description */
  description: string
  /** Optional customer email */
  customerEmail?: string
  /** Optional line items */
  lineItems?: Array<{ name: string; amount: string }>
  /** Optional metadata */
  metadata?: Record<string, string>
  /** Base64 of 32-byte commitment nonce (matches the commitment computation) */
  nonce: string
}

export interface EncryptedBlob {
  /** Base64 of nacl.box ciphertext */
  ciphertext: string
  /** Base64 of 24-byte nacl box nonce (different from commitment nonce!) */
  boxNonce: string
  /** Base64 of sender's ephemeral public key */
  ephemeralPubkey: string
  /** Base64 of recipient's public key (echoed for convenience) */
  recipientPubkey: string
}

/**
 * Encrypts an invoice payload to the recipient's x25519 public key.
 * Uses NaCl Box (Curve25519 + XSalsa20 + Poly1305).
 *
 * The ephemeral keypair provides forward secrecy: even if the recipient's
 * long-term key is compromised later, past messages encrypted with different
 * ephemeral keys remain secure.
 *
 * @throws if recipient key is malformed
 */
export function encryptInvoicePayload(
  payload: InvoicePayload,
  recipientPubkey: Uint8Array
): EncryptedBlob {
  if (recipientPubkey.length !== 32) {
    throw new Error('Recipient pubkey must be 32 bytes (x25519)')
  }

  // Generate ephemeral keypair for forward secrecy
  const ephemeral = nacl.box.keyPair()

  const message = new TextEncoder().encode(JSON.stringify(payload))
  const boxNonce = nacl.randomBytes(nacl.box.nonceLength) // 24 bytes

  const ciphertext = nacl.box(message, boxNonce, recipientPubkey, ephemeral.secretKey)
  if (!ciphertext) {
    throw new Error('Encryption failed')
  }

  // Securely zero the ephemeral secret key
  ephemeral.secretKey.fill(0)

  return {
    ciphertext: encodeBase64(ciphertext),
    boxNonce: encodeBase64(boxNonce),
    ephemeralPubkey: encodeBase64(ephemeral.publicKey),
    recipientPubkey: encodeBase64(recipientPubkey),
  }
}

/**
 * Decrypts a blob using the recipient's x25519 secret key.
 *
 * @throws if the blob is malformed or the secret key doesn't match
 */
export function decryptInvoicePayload(
  blob: EncryptedBlob,
  recipientSecretKey: Uint8Array
): InvoicePayload {
  if (recipientSecretKey.length !== 32) {
    throw new Error('Recipient secret key must be 32 bytes')
  }

  const ciphertext = decodeBase64(blob.ciphertext)
  const boxNonce = decodeBase64(blob.boxNonce)
  const ephemeralPubkey = decodeBase64(blob.ephemeralPubkey)

  const decrypted = nacl.box.open(ciphertext, boxNonce, ephemeralPubkey, recipientSecretKey)
  if (!decrypted) {
    throw new Error('Decryption failed - wrong key or tampered blob')
  }

  return JSON.parse(new TextDecoder().decode(decrypted))
}

/**
 * Generate an x25519 keypair for invoice recipients.
 * The customer should run this once and share their publicKey with the merchant.
 * The secretKey must be kept private.
 */
export function generateRecipientKeypair(): { publicKey: string; secretKey: string } {
  const kp = nacl.box.keyPair()
  return {
    publicKey: encodeBase64(kp.publicKey),
    secretKey: encodeBase64(kp.secretKey),
  }
}

// Re-export base64 helpers for convenience
export { encodeBase64, decodeBase64 } from 'tweetnacl-util'
