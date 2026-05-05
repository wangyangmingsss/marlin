/**
 * Parse a decimal string (e.g. "99.50") to BigInt in smallest unit
 * NEVER use floating point for amounts
 */
export function parseDecimalToBigInt(input: string, decimals: number): bigint {
  if (!/^\d+(\.\d{1,12})?$/.test(input)) throw new Error('Invalid decimal format')
  const [whole, frac = ''] = input.split('.')
  const padded = (frac + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(padded)
}

/**
 * Format BigInt amount to human-readable string
 */
export function formatBigIntAmount(amount: bigint, decimals: number): string {
  const str = amount.toString().padStart(decimals + 1, '0')
  const whole = str.slice(0, str.length - decimals) || '0'
  const frac = str.slice(str.length - decimals)
  const trimmed = frac.slice(0, 2).padEnd(2, '0')
  return `${whole}.${trimmed}`
}

/**
 * Format amount with dollar sign
 */
export function formatUsdAmount(amount: bigint, decimals: number): string {
  return `$${formatBigIntAmount(amount, decimals)}`
}
