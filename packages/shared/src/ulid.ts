import { ulid } from 'ulidx'

/**
 * Generate ULID as 16 raw bytes for use in PDA seeds
 */
export function ulidToBytes(id?: string): Uint8Array {
  const ulidStr = id ?? ulid()
  // Crockford Base32 decode
  const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
  const bytes = new Uint8Array(16)
  const upper = ulidStr.toUpperCase()

  // ULID is 26 chars of Crockford Base32, encoding 128 bits (16 bytes)
  let bitBuffer = 0n
  for (let i = 0; i < 26; i++) {
    const val = ENCODING.indexOf(upper[i])
    if (val === -1) throw new Error(`Invalid ULID character: ${upper[i]}`)
    bitBuffer = (bitBuffer << 5n) | BigInt(val)
  }

  for (let i = 15; i >= 0; i--) {
    bytes[i] = Number(bitBuffer & 0xffn)
    bitBuffer >>= 8n
  }

  return bytes
}

/**
 * Convert 16-byte array to hex string for DB storage
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Convert hex string back to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}
