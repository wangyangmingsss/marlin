/**
 * Validate a Solana wallet address
 */
export function isValidWalletAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
}

/**
 * Truncate address for display: Ax12...zY9k
 */
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

/**
 * Get Solscan URL for address or transaction
 */
export function solscanUrl(
  value: string,
  type: 'account' | 'tx' = 'account',
  cluster: string = 'devnet',
): string {
  const base = 'https://solscan.io'
  const path = type === 'tx' ? 'tx' : 'account'
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`
  return `${base}/${path}/${value}${clusterParam}`
}
