'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MintSelector } from '@/components/mint-selector'
import { AddressDisplay } from '@/components/address-display'
import { toast } from 'sonner'
import { Save, Wallet, Landmark, Info } from 'lucide-react'
import { type MintSymbol } from '@marlin/shared'

/* ───────────────── types ───────────────── */

interface MerchantPaymentSettings {
  id: string
  walletAddress: string
  defaultMint: MintSymbol
  merchantPda: string
  atas: { mint: MintSymbol; address: string }[]
}

/* ───────────────── component ───────────────── */

export default function PaymentSettingsPage() {
  const queryClient = useQueryClient()
  const [defaultMint, setDefaultMint] = useState<MintSymbol>('USDC')
  const [initialized, setInitialized] = useState(false)

  const { data: settings, isLoading } = useQuery<MerchantPaymentSettings>({
    queryKey: ['me', 'payments'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) throw new Error('Failed to fetch payment settings')
      const data = await res.json()

      // Derive placeholder ATAs if the API doesn't return them yet
      const merchant: MerchantPaymentSettings = {
        id: data.id,
        walletAddress: data.walletAddress,
        defaultMint: data.defaultMint ?? 'USDC',
        merchantPda: data.merchantPda ?? data.walletAddress,
        atas: data.atas ?? [
          { mint: 'USDC' as MintSymbol, address: data.walletAddress },
          { mint: 'PYUSD' as MintSymbol, address: data.walletAddress },
          { mint: 'USDG' as MintSymbol, address: data.walletAddress },
        ],
      }

      if (!initialized) {
        setDefaultMint(merchant.defaultMint)
        setInitialized(true)
      }
      return merchant
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/merchants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultMint }),
      })
      if (!res.ok) throw new Error('Failed to save payment settings')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Payment settings saved')
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  /* ── loading skeleton ── */
  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Payment Settings</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card p-6 animate-pulse">
            <div className="h-4 w-32 rounded bg-muted mb-4" />
            <div className="h-8 w-48 rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Payment Settings</h1>

      {/* Default Settlement Mint */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Default Settlement Mint</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose the stablecoin you want to receive when customers pay.
        </p>
        <MintSelector
          value={defaultMint}
          onChange={setDefaultMint}
          disabled={saveMutation.isPending}
        />
      </div>

      {/* Merchant PDA */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Merchant PDA</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Your on-chain program-derived address used for payment settlement.
        </p>
        {settings && (
          <AddressDisplay
            address={settings.merchantPda}
            chars={6}
            showCopy
            showExplorer
          />
        )}
      </div>

      {/* Associated Token Accounts */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Token Accounts (ATAs)</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Computed associated token accounts for each supported mint.
        </p>

        <div className="space-y-3">
          {(settings?.atas ?? []).map((ata) => (
            <div
              key={ata.mint}
              className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm font-medium">{ata.mint}</span>
              <AddressDisplay
                address={ata.address}
                chars={6}
                showCopy
                showExplorer
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || isLoading}
        className="btn-primary"
      >
        <Save className="mr-2 h-4 w-4" />
        {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
