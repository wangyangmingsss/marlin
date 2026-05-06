import { describe, it, expect } from 'vitest'
import { parseDecimalToBigInt, formatBigIntAmount, formatUsdAmount } from '../src/amount'

describe('parseDecimalToBigInt', () => {
  it('parses whole number', () => {
    expect(parseDecimalToBigInt('100', 6)).toBe(100_000_000n)
  })

  it('parses number with decimals', () => {
    expect(parseDecimalToBigInt('99.50', 6)).toBe(99_500_000n)
  })

  it('parses number with max decimals', () => {
    expect(parseDecimalToBigInt('1.123456', 6)).toBe(1_123_456n)
  })

  it('truncates extra decimals', () => {
    expect(parseDecimalToBigInt('1.1234567', 6)).toBe(1_123_456n)
  })

  it('handles zero', () => {
    expect(parseDecimalToBigInt('0', 6)).toBe(0n)
  })

  it('handles zero with decimals', () => {
    expect(parseDecimalToBigInt('0.01', 6)).toBe(10_000n)
  })

  it('handles large numbers', () => {
    expect(parseDecimalToBigInt('1000000', 6)).toBe(1_000_000_000_000n)
  })

  it('throws on invalid input', () => {
    expect(() => parseDecimalToBigInt('abc', 6)).toThrow('Invalid decimal format')
  })

  it('throws on negative number', () => {
    expect(() => parseDecimalToBigInt('-1', 6)).toThrow('Invalid decimal format')
  })

  it('throws on empty string', () => {
    expect(() => parseDecimalToBigInt('', 6)).toThrow('Invalid decimal format')
  })
})

describe('formatBigIntAmount', () => {
  it('formats whole amounts', () => {
    expect(formatBigIntAmount(100_000_000n, 6)).toBe('100.00')
  })

  it('formats fractional amounts', () => {
    expect(formatBigIntAmount(99_500_000n, 6)).toBe('99.50')
  })

  it('formats zero', () => {
    expect(formatBigIntAmount(0n, 6)).toBe('0.00')
  })

  it('formats small amounts', () => {
    expect(formatBigIntAmount(1n, 6)).toBe('0.00')
  })

  it('formats amounts less than 1', () => {
    expect(formatBigIntAmount(500_000n, 6)).toBe('0.50')
  })

  it('formats large amounts', () => {
    expect(formatBigIntAmount(1_000_000_000_000n, 6)).toBe('1000000.00')
  })
})

describe('formatUsdAmount', () => {
  it('adds dollar sign', () => {
    expect(formatUsdAmount(100_000_000n, 6)).toBe('$100.00')
  })

  it('formats zero with dollar sign', () => {
    expect(formatUsdAmount(0n, 6)).toBe('$0.00')
  })
})
