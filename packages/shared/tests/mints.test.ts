import { describe, it, expect } from 'vitest'
import { getMints, symbolFromMint, isSupportedMint, MAINNET_MINTS, DEVNET_MINTS } from '../src/mints'

describe('getMints', () => {
  it('returns mainnet mints for mainnet-beta', () => {
    const mints = getMints('mainnet-beta')
    expect(mints.USDC).toBe(MAINNET_MINTS.USDC)
    expect(mints.PYUSD).toBe(MAINNET_MINTS.PYUSD)
    expect(mints.USDG).toBe(MAINNET_MINTS.USDG)
  })

  it('returns devnet mints for devnet', () => {
    const mints = getMints('devnet')
    expect(mints.USDC).toBe(DEVNET_MINTS.USDC)
    expect(mints.PYUSD).toBe(DEVNET_MINTS.PYUSD)
    expect(mints.USDG).toBe(DEVNET_MINTS.USDG)
  })

  it('returns devnet mints for localnet', () => {
    const mints = getMints('localnet')
    expect(mints.USDC).toBe(DEVNET_MINTS.USDC)
  })
})

describe('symbolFromMint', () => {
  it('resolves mainnet USDC', () => {
    expect(symbolFromMint(MAINNET_MINTS.USDC)).toBe('USDC')
  })

  it('resolves devnet PYUSD', () => {
    expect(symbolFromMint(DEVNET_MINTS.PYUSD)).toBe('PYUSD')
  })

  it('returns null for unknown mint', () => {
    expect(symbolFromMint('UnknownMint111111111111111111111111111111111')).toBeNull()
  })
})

describe('isSupportedMint', () => {
  it('returns true for supported mainnet mints', () => {
    expect(isSupportedMint(MAINNET_MINTS.USDC)).toBe(true)
    expect(isSupportedMint(MAINNET_MINTS.PYUSD)).toBe(true)
    expect(isSupportedMint(MAINNET_MINTS.USDG)).toBe(true)
  })

  it('returns true for supported devnet mints', () => {
    expect(isSupportedMint(DEVNET_MINTS.USDC)).toBe(true)
    expect(isSupportedMint(DEVNET_MINTS.PYUSD)).toBe(true)
    expect(isSupportedMint(DEVNET_MINTS.USDG)).toBe(true)
  })

  it('returns false for unsupported mint', () => {
    expect(isSupportedMint('11111111111111111111111111111111')).toBe(false)
  })
})
