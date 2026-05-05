'use client'

import dynamic from 'next/dynamic'

const WalletMultiButton = dynamic(
  async () =>
    (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false },
)

export function WalletButton() {
  return <WalletMultiButton className="btn-primary !h-9 !text-sm" />
}
