export const PROTOCOL_FEE_BPS = 50
export const BPS_DENOMINATOR = 10_000
export const MIN_PERIOD_SECONDS = 86_400

// Stablecoin decimals
export const MINT_DECIMALS: Record<string, number> = {
  USDC: 6,
  PYUSD: 6,
  USDG: 6,
}

// Program IDs
export const MARLIN_PROGRAM_ID_DEVNET = 'MRLNxMrRgKMFnHEuJPsWnbDzDRKdNHvisijd7Gg6MjZ'
export const MARLIN_PROGRAM_ID_MAINNET = '' // pending audit + deploy

export const SOLANA_DEVNET_RPC = 'https://api.devnet.solana.com'

// Protocol fee receiver
export const PROTOCOL_FEE_RECEIVER = 'HpwaQ1H2qqCs8a7ZEeq8s8Hm9qUvJnLvWTc6vXsbRFzT'

// Devnet stablecoin mints
export const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
// PYUSD and USDG: these are already in the program allowlist as devnet mocks
export const PYUSD_MINT_DEVNET = process.env.PYUSD_MINT_DEVNET || 'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM'
export const USDG_MINT_DEVNET = process.env.USDG_MINT_DEVNET || 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'

// Mainnet stablecoin mints
export const USDC_MINT_MAINNET = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const PYUSD_MINT_MAINNET = '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo'
export const USDG_MINT_MAINNET = '2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH'
