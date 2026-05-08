import { describe, it, expect } from 'vitest'
import { isValidWalletAddress, truncateAddress, solscanUrl } from '../src/validation'

describe('isValidWalletAddress', () => {
  it('accepts valid Solana address', () => {
    expect(isValidWalletAddress('11111111111111111111111111111111')).toBe(true)
  })

  it('accepts long base58 address', () => {
    expect(isValidWalletAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(isValidWalletAddress('')).toBe(false)
  })

  it('rejects address with invalid characters (0, O, I, l)', () => {
    expect(isValidWalletAddress('0OIl111111111111111111111111111111')).toBe(false)
  })

  it('rejects too short address', () => {
    expect(isValidWalletAddress('abc')).toBe(false)
  })

  it('rejects address with spaces', () => {
    expect(isValidWalletAddress('1111 1111111111111111111111111111')).toBe(false)
  })
})

describe('truncateAddress', () => {
  it('truncates long address', () => {
    const addr = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    expect(truncateAddress(addr)).toBe('EPjF...Dt1v')
  })

  it('uses custom char count', () => {
    const addr = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    expect(truncateAddress(addr, 6)).toBe('EPjFWd...yTDt1v')
  })

  it('does not truncate short strings', () => {
    expect(truncateAddress('short')).toBe('short')
  })
})

describe('solscanUrl', () => {
  it('generates devnet account URL', () => {
    const url = solscanUrl('abc123', 'account', 'devnet')
    expect(url).toBe('https://solscan.io/account/abc123?cluster=devnet')
  })

  it('generates mainnet account URL without cluster param', () => {
    const url = solscanUrl('abc123', 'account', 'mainnet-beta')
    expect(url).toBe('https://solscan.io/account/abc123')
  })

  it('generates transaction URL', () => {
    const url = solscanUrl('txhash', 'tx', 'devnet')
    expect(url).toBe('https://solscan.io/tx/txhash?cluster=devnet')
  })

  it('defaults to account type and devnet', () => {
    const url = solscanUrl('addr')
    expect(url).toBe('https://solscan.io/account/addr?cluster=devnet')
  })
})
