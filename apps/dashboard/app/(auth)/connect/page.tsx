'use client'

import { useEffect, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '@/components/wallet-button'
import { Waves, Shield, Zap, Globe } from 'lucide-react'
import { toast } from 'sonner'
import bs58 from 'bs58'

export default function ConnectPage() {
  const router = useRouter()
  const { publicKey, signMessage, connected } = useWallet()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleLogin = useCallback(async () => {
    if (!publicKey || !signMessage || isLoggingIn) return
    setIsLoggingIn(true)

    try {
      const address = publicKey.toBase58()

      // 1. Get nonce
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`)
      if (!nonceRes.ok) throw new Error('Failed to get nonce')
      const { message, nonce } = await nonceRes.json()

      // 2. Sign message
      const encoded = new TextEncoder().encode(message)
      const sig = await signMessage(encoded)
      const signature = bs58.encode(sig)

      // 3. Login
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, nonce }),
      })

      if (!loginRes.ok) {
        const err = await loginRes.json()
        throw new Error(err.error?.message || 'Login failed')
      }

      const { isNew } = await loginRes.json()
      router.push(isNew ? '/onboarding' : '/dashboard')
    } catch (err: any) {
      if (err?.message?.includes('User rejected')) {
        toast.error('Signature rejected')
      } else {
        toast.error(err?.message || 'Login failed')
      }
    } finally {
      setIsLoggingIn(false)
    }
  }, [publicKey, signMessage, isLoggingIn, router])

  useEffect(() => {
    if (connected && publicKey && !isLoggingIn) {
      handleLogin()
    }
  }, [connected, publicKey, handleLogin, isLoggingIn])

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-2xl bg-primary/10 p-4">
          <Waves className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Marlin</h1>
        <p className="text-center text-muted-foreground">
          Connect your Solana wallet to access the stablecoin billing dashboard.
        </p>
      </div>

      {/* Connect card */}
      <div className="glass-card p-8 space-y-6">
        <div className="flex justify-center">
          <WalletButton />
        </div>

        {isLoggingIn && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Signing in...
            </div>
          </div>
        )}

        {/* Features */}
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            Sign-in with Solana (SIWS) - no passwords needed
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" />
            Non-custodial - you keep your keys
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Globe className="h-4 w-4 text-primary" />
            Supports Phantom, Backpack, and Solflare
          </div>
        </div>
      </div>
    </div>
  )
}
