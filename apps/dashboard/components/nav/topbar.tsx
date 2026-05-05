'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { truncateAddress } from '@marlin/shared'
import { WalletButton } from '@/components/wallet-button'
import { Bell } from 'lucide-react'

export function Topbar() {
  const { publicKey } = useWallet()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-6">
      <div />
      <div className="flex items-center gap-4">
        <button className="btn-ghost p-2 rounded-lg relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </button>
        {publicKey && (
          <span className="rounded-lg bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
            {truncateAddress(publicKey.toBase58())}
          </span>
        )}
        <WalletButton />
      </div>
    </header>
  )
}
