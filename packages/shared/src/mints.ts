export const MAINNET_MINTS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  PYUSD: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
  USDG: '2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH',
} as const

export const DEVNET_MINTS = {
  USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  PYUSD: 'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM',
  USDG: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
} as const

export type MintSymbol = 'USDC' | 'PYUSD' | 'USDG'

export function getMints(cluster: string): Record<MintSymbol, string> {
  return cluster === 'mainnet-beta' ? MAINNET_MINTS : DEVNET_MINTS
}

export function symbolFromMint(mintAddress: string): MintSymbol | null {
  for (const [sym, addr] of Object.entries({ ...MAINNET_MINTS, ...DEVNET_MINTS })) {
    if (addr === mintAddress) return sym as MintSymbol
  }
  return null
}

export function isSupportedMint(mintAddress: string): boolean {
  return symbolFromMint(mintAddress) !== null
}
