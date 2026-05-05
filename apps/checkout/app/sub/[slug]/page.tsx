'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Transaction, PublicKey } from '@solana/web3.js'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
  Wallet,
  RefreshCw,
  Calendar,
  Zap,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PlanData {
  id: string
  name: string
  description: string | null
  amountPerPeriod: string
  mintSymbol: string
  periodSeconds: number
  trialSeconds: number
  active: boolean
  publicSlug: string
  merchant: { displayName: string; walletAddress: string }
}

type SubscribeStage =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'submitting'
  | 'confirming'
  | 'done'
  | 'error'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function truncateAddress(addr: string): string {
  if (addr.length <= 8) return addr
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

function formatAmount(amount: string, decimals: number): string {
  const str = amount.padStart(decimals + 1, '0')
  const whole = str.slice(0, str.length - decimals) || '0'
  const frac = str.slice(str.length - decimals).slice(0, 2).padEnd(2, '0')
  return `${whole}.${frac}`
}

function formatPeriod(seconds: number): string {
  const days = seconds / 86400
  if (days === 7) return 'week'
  if (days === 30 || days === 31) return 'month'
  if (days === 365 || days === 366) return 'year'
  if (days === 1) return 'day'
  return `${days} days`
}

function formatTrialDays(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  if (days === 0) return ''
  if (days === 1) return '1-day free trial'
  if (days === 7) return '7-day free trial'
  if (days === 14) return '14-day free trial'
  if (days === 30) return '30-day free trial'
  return `${days}-day free trial`
}

function solscanUrl(sig: string): string {
  const base = 'https://solscan.io/tx/'
  const suffix = CLUSTER === 'mainnet-beta' ? '' : `?cluster=${CLUSTER}`
  return `${base}${sig}${suffix}`
}

/* ------------------------------------------------------------------ */
/*  Authorization multipliers                                          */
/* ------------------------------------------------------------------ */

const AUTH_OPTIONS = [
  { label: '6 months', multiplier: 6 },
  { label: '1 year', multiplier: 12 },
  { label: '2 years', multiplier: 24 },
]

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                      */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/20">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
          <div className="h-12 bg-muted rounded w-2/3 mx-auto" />
          <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          <div className="h-12 bg-muted rounded-lg w-full" />
        </div>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <div className="text-center mt-6">
      <a
        href="https://marlin.fi"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Powered by Marlin
      </a>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function SubscriptionCheckoutPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const { connection } = useConnection()
  const wallet = useWallet()
  const { setVisible: openWalletModal } = useWalletModal()

  const [plan, setPlan] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  const [authMultiplier, setAuthMultiplier] = useState(24) // default 2 years
  const [stage, setStage] = useState<SubscribeStage>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [txSignature, setTxSignature] = useState<string | null>(null)

  /* Fetch plan ------------------------------------------------------- */
  useEffect(() => {
    if (!slug) return
    ;(async () => {
      try {
        setLoading(true)
        setFetchError(false)
        const res = await fetch(`${API_URL}/api/public/plan/${slug}`)
        if (!res.ok) {
          setFetchError(true)
          return
        }
        const data: PlanData = await res.json()
        setPlan(data)
      } catch {
        setFetchError(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [slug])

  /* Subscribe handler ------------------------------------------------ */
  const handleSubscribe = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !plan) return

    setStage('preparing')
    setErrorMessage(null)
    setTxSignature(null)

    try {
      const maxAuthorized =
        BigInt(plan.amountPerPeriod) * BigInt(authMultiplier)

      const res = await fetch(
        `${API_URL}/api/public/plan/${slug}/build-subscribe-tx`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerWallet: wallet.publicKey.toBase58(),
            maxAuthorized: maxAuthorized.toString(),
          }),
        },
      )

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error?.message || `Server error (${res.status})`)
      }

      const { unsignedTx } = await res.json()
      const txBuffer = Buffer.from(unsignedTx, 'base64')
      const transaction = Transaction.from(txBuffer)

      setStage('signing')
      const signed = await wallet.signTransaction(transaction)

      setStage('submitting')
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      })

      setStage('confirming')
      const confirmation = await connection.confirmTransaction(sig, 'confirmed')

      if (confirmation.value.err) {
        throw new Error('Transaction failed on-chain. Please try again.')
      }

      setTxSignature(sig)
      setStage('done')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred'
      if (
        message.includes('User rejected') ||
        message.includes('Transaction rejected')
      ) {
        setStage('idle')
        return
      }
      setErrorMessage(message)
      setStage('error')
    }
  }, [wallet, plan, slug, authMultiplier, connection])

  /* Render ----------------------------------------------------------- */
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <LoadingSkeleton />
      </main>
    )
  }

  if (fetchError || !plan) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/20 text-center">
            <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Plan not found
            </h2>
            <p className="text-sm text-muted-foreground">
              This subscription plan does not exist or the link is invalid.
            </p>
          </div>
          <Footer />
        </div>
      </main>
    )
  }

  if (!plan.active) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/20 text-center">
            <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Plan unavailable
            </h2>
            <p className="text-sm text-muted-foreground">
              This subscription plan is no longer accepting new subscribers.
            </p>
          </div>
          <Footer />
        </div>
      </main>
    )
  }

  const amountFormatted = formatAmount(plan.amountPerPeriod, 6)
  const period = formatPeriod(plan.periodSeconds)
  const trialLabel = plan.trialSeconds > 0 ? formatTrialDays(plan.trialSeconds) : null
  const isConnected = !!wallet.publicKey

  /* Success state */
  if (stage === 'done') {
    const nextChargeDate = new Date()
    nextChargeDate.setSeconds(
      nextChargeDate.getSeconds() +
        (plan.trialSeconds > 0 ? plan.trialSeconds : plan.periodSeconds),
    )

    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/20 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              You&apos;re subscribed!
            </h2>
            <p className="text-sm text-muted-foreground mb-1">
              {plan.name} &mdash; ${amountFormatted} {plan.mintSymbol} / {period}
            </p>
            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mb-4">
              <Calendar className="w-4 h-4" />
              <span>
                {plan.trialSeconds > 0 ? 'First charge' : 'Next charge'}:{' '}
                {nextChargeDate.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            {txSignature && (
              <a
                href={solscanUrl(txSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover transition-colors font-mono"
              >
                {truncateAddress(txSignature)}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <Footer />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/20 relative overflow-hidden">
          {/* Progress overlay */}
          {stage !== 'idle' && stage !== 'done' && (
            <div className="absolute inset-0 bg-card/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-8 z-10">
              {stage === 'error' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-4">
                    <XCircle className="w-10 h-10 text-danger" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Subscription failed
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
                    {errorMessage || 'An unexpected error occurred.'}
                  </p>
                  <button
                    onClick={() => {
                      setStage('idle')
                      setErrorMessage(null)
                    }}
                    className="btn-primary text-sm px-6 py-2.5 inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try again
                  </button>
                </>
              ) : (
                <>
                  <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {stage === 'preparing' && 'Preparing transaction...'}
                    {stage === 'signing' && 'Waiting for wallet signature...'}
                    {stage === 'submitting' && 'Submitting transaction...'}
                    {stage === 'confirming' && 'Confirming on-chain...'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Do not close this window
                  </p>
                </>
              )}
            </div>
          )}

          {/* Merchant */}
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-1">Subscribe to</p>
            <h1 className="text-lg font-semibold text-foreground">
              {plan.merchant.displayName}
            </h1>
          </div>

          {/* Plan info */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-foreground mb-2">
              {plan.name}
            </h2>
            <div className="font-mono text-4xl font-bold text-foreground tracking-tight">
              ${amountFormatted}
            </div>
            <div className="mt-1 text-muted-foreground text-sm">
              <span className="text-primary font-medium">{plan.mintSymbol}</span>{' '}
              / {period}
            </div>
          </div>

          {plan.description && (
            <p className="text-sm text-muted-foreground text-center mb-6">
              {plan.description}
            </p>
          )}

          {/* Trial badge */}
          {trialLabel && (
            <div className="flex justify-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
                <Zap className="w-3.5 h-3.5" />
                {trialLabel}
              </span>
            </div>
          )}

          {/* Authorization duration selector */}
          {isConnected && (
            <div className="mb-6">
              <label className="block text-sm text-muted-foreground mb-2">
                Authorize charges for
              </label>
              <div className="grid grid-cols-3 gap-2">
                {AUTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.multiplier}
                    onClick={() => setAuthMultiplier(opt.multiplier)}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-colors border ${
                      authMultiplier === opt.multiplier
                        ? 'bg-primary text-white border-primary'
                        : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Max: ${formatAmount(
                  (BigInt(plan.amountPerPeriod) * BigInt(authMultiplier)).toString(),
                  6,
                )}{' '}
                {plan.mintSymbol}. You can revoke anytime.
              </p>
            </div>
          )}

          {/* Wallet info */}
          {isConnected && (
            <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Wallet</span>
                <span className="font-mono text-xs text-foreground">
                  {truncateAddress(wallet.publicKey!.toBase58())}
                </span>
              </div>
            </div>
          )}

          {/* Action button */}
          {isConnected ? (
            <button
              onClick={handleSubscribe}
              disabled={stage !== 'idle'}
              className="w-full btn-primary py-3.5 text-base font-semibold rounded-xl"
            >
              Subscribe &mdash; ${amountFormatted} / {period}
            </button>
          ) : (
            <button
              onClick={() => openWalletModal(true)}
              className="w-full btn-primary py-3.5 text-base font-semibold rounded-xl inline-flex items-center justify-center gap-2"
            >
              <Wallet className="w-5 h-5" />
              Connect Wallet to Subscribe
            </button>
          )}

          {/* Note */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            You can cancel or pause your subscription at any time by revoking
            the token delegate in your wallet.
          </p>
        </div>

        <Footer />
      </div>
    </main>
  )
}
