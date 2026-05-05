'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { AddressDisplay } from '@/components/address-display'
import { toast } from 'sonner'
import { Save, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface MerchantSettings {
  id: string
  walletAddress: string
  label?: string
  webhookUrl?: string
  createdAt: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { disconnect } = useWallet()
  const queryClient = useQueryClient()
  const [label, setLabel] = useState('')
  const [initialized, setInitialized] = useState(false)

  const { data: merchant, isLoading } = useQuery<MerchantSettings>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      if (!initialized) {
        setLabel(data.label || '')
        setInitialized(true)
      }
      return data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/merchants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label || undefined }),
      })
      if (!res.ok) throw new Error('Failed to save')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Settings saved')
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    disconnect()
    router.push('/connect')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-medium">Merchant Profile</h3>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Business Name</label>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Your business name" className="input-base" disabled={isLoading} maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Wallet</label>
          {merchant && <AddressDisplay address={merchant.walletAddress} />}
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Member Since</label>
          <p className="text-sm text-muted-foreground">{merchant ? new Date(merchant.createdAt).toLocaleDateString() : '--'}</p>
        </div>
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || isLoading} className="btn-primary">
          <Save className="mr-2 h-4 w-4" /> {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-medium text-danger">Danger Zone</h3>
        <button onClick={handleLogout} className="btn-danger">
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </button>
      </div>
    </div>
  )
}
