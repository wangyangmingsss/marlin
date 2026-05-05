'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import { Waves } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const { publicKey } = useWallet()
  const [label, setLabel] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/merchants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label || undefined }),
      })
      if (!res.ok) throw new Error('Failed to update profile')
      toast.success('Welcome to Marlin!')
      router.push('/dashboard')
    } catch {
      toast.error('Setup failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-2xl bg-primary/10 p-4">
          <Waves className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Welcome to Marlin</h1>
        <p className="text-center text-sm text-muted-foreground">
          Set up your merchant profile to get started with stablecoin billing.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Business Name</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., Acme Corp"
            className="input-base"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            This will appear on invoices and checkout pages.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Wallet Address</label>
          <p className="font-mono text-xs text-muted-foreground break-all rounded-lg bg-muted p-3">
            {publicKey?.toBase58() ?? 'Not connected'}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full"
        >
          {isSubmitting ? 'Setting up...' : 'Complete Setup'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="btn-ghost w-full"
        >
          Skip for now
        </button>
      </form>
    </div>
  )
}
