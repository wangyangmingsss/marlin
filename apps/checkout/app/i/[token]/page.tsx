'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Transaction, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  ExternalLink,
  Wallet,
  RefreshCw,
  Ban,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InvoiceData {
  onchainId: string
  merchant: { label: string; walletAddress: string }
  amount: string
  amountFormatted: string
  mint: string
  status: 'Open' | 'Paid' | 'Void' | 'Expired'
  memo: string | null
  expiresAt: string | null
  createdAt: string
  txSignature?: string | null
}

type PaymentStage =
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

const MINT_ADDRESSES: Record<string, Record<string, string>> = {
  'mainnet-beta': {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    PYUSD: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
    USDG: '2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH',
  },
  devnet: {
    USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    PYUSD: 'CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM',
    USDG: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
  },
}

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

function solscanUrl(sig: string): string {
  const base = 'https://solscan.io/tx/'
  const suffix = CLUSTER === 'mainnet-beta' ? '' : `?cluster=${CLUSTER}`
  return `${base}${sig}${suffix}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
          <div className="space-y-3">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
          <div className="h-12 bg-muted rounded-lg w-full" />
        </div>
      </div>
    </div>
  )
}

function StatusCard({
  icon,
  title,
  subtitle,
  txSignature,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  txSignature?: string | null
}) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/20 text-center">
        <div className="flex justify-center mb-4">{icon}</div>
        <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
        {txSignature && (
          <a
            href={solscanUrl(txSignature)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-primary hover:text-primary-hover transition-colors font-mono"
          >
            {truncateAddress(txSignature)}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      <Footer />
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

function ErrorDisplay() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/20 text-center">
        <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Invoice not found
        </h2>
        <p className="text-sm text-muted-foreground">
          This invoice does not exist or the link is invalid.
        </p>
      </div>
      <Footer />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Payment progress indicator                                        */
/* ------------------------------------------------------------------ */

const STAGE_LABELS: Record<PaymentStage, string> = {
  idle: '',
  preparing: 'Preparing transaction...',
  signing: 'Waiting for wallet signature...',
  submitting: 'Submitting transaction...',
  confirming: 'Confirming on-chain...',
  done: 'Payment successful!',
  error: 'Payment failed',
}

function ProgressOverlay({
  stage,
  errorMessage,
  txSignature,
  onRetry,
  onDone,
}: {
  stage: PaymentStage
  errorMessage: string | null
  txSignature: string | null
  onRetry: () => void
  onDone: () => void
}) {
  if (stage === 'idle') return null

  return (
    <div className="absolute inset-0 bg-card/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-8 z-10">
      {stage === 'done' ? (
        <>
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Payment successful!
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your payment has been confirmed on-chain.
          </p>
          {txSignature && (
            <a
              href={solscanUrl(txSignature)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover transition-colors font-mono mb-4"
            >
              {truncateAddress(txSignature)}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button onClick={onDone} className="btn-secondary text-sm px-6 py-2">
            Done
          </button>
        </>
      ) : stage === 'error' ? (
        <>
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-4">
            <XCircle className="w-10 h-10 text-danger" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Payment failed
          </h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
            {errorMessage || 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={onRetry}
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
            {STAGE_LABELS[stage]}
          </h3>
          <p className="text-xs text-muted-foreground">
            Do not close this window
          </p>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function InvoiceCheckoutPage() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const { connection } = useConnection()
  const wallet = useWallet()
  const { setVisible: openWalletModal } = useWalletModal()

  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  const [stage, setStage] = useState<PaymentStage>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [txSignature, setTxSignature] = useState<string | null>(null)
  const [tokenBalance, setTokenBalance] = useState<string | null>(null)

  /* Fetch invoice -------------------------------------------------- */
  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true)
      setFetchError(false)
      const res = await fetch(
        `${API_URL}/api/public/invoice/${token}`,
      )
      if (!res.ok) {
        setFetchError(true)
        return
      }
      const data: InvoiceData = await res.json()
      setInvoice(data)
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) fetchInvoice()
  }, [token, fetchInvoice])

  /* Fetch token balance when wallet connects ----------------------- */
  useEffect(() => {
    if (!wallet.publicKey || !invoice) {
      setTokenBalance(null)
      return
    }

    const clusterKey = CLUSTER === 'mainnet-beta' ? 'mainnet-beta' : 'devnet'
    const mintAddr = MINT_ADDRESSES[clusterKey]?.[invoice.mint]
    if (!mintAddr) return

    let cancelled = false
    ;(async () => {
      try {
        const ata = await getAssociatedTokenAddress(
          new PublicKey(mintAddr),
          wallet.publicKey!,
        )
        const account = await getAccount(connection, ata)
        if (!cancelled) {
          setTokenBalance(formatAmount(account.amount.toString(), 6))
        }
      } catch {
        if (!cancelled) setTokenBalance('0.00')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [wallet.publicKey, invoice, connection])

  /* Pay handler ---------------------------------------------------- */
  const handlePay = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !invoice) return

    setStage('preparing')
    setErrorMessage(null)
    setTxSignature(null)

    try {
      const res = await fetch(
        `${API_URL}/api/public/invoice/${token}/build-payment-tx`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payerWallet: wallet.publicKey.toBase58() }),
        },
      )

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(
          err?.message || `Server error (${res.status})`,
        )
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
  }, [wallet, invoice, token, connection])

  /* Render --------------------------------------------------------- */
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <LoadingSkeleton />
      </main>
    )
  }

  if (fetchError || !invoice) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <ErrorDisplay />
      </main>
    )
  }

  /* Non-open statuses */
  if (invoice.status === 'Paid') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <StatusCard
          icon={
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
          }
          title="Already paid"
          subtitle="This invoice has been settled."
          txSignature={invoice.txSignature}
        />
      </main>
    )
  }

  if (invoice.status === 'Void') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <StatusCard
          icon={
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
              <Ban className="w-10 h-10 text-danger" />
            </div>
          }
          title="Invoice canceled"
          subtitle="This invoice has been voided by the merchant."
        />
      </main>
    )
  }

  if (invoice.status === 'Expired') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <StatusCard
          icon={
            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
              <Clock className="w-10 h-10 text-warning" />
            </div>
          }
          title="Invoice expired"
          subtitle="This invoice is past its due date and can no longer be paid."
        />
      </main>
    )
  }

  /* Open invoice */
  const isConnected = !!wallet.publicKey

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/20 relative overflow-hidden">
          <ProgressOverlay
            stage={stage}
            errorMessage={errorMessage}
            txSignature={txSignature}
            onRetry={() => {
              setStage('idle')
              setErrorMessage(null)
            }}
            onDone={() => fetchInvoice()}
          />

          {/* Merchant */}
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground mb-1">Payment to</p>
            <h1 className="text-lg font-semibold text-foreground">
              {invoice.merchant.label}
            </h1>
          </div>

          {/* Amount */}
          <div className="text-center mb-8">
            <div className="font-mono text-4xl font-bold text-foreground tracking-tight">
              ${invoice.amountFormatted}
            </div>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              {invoice.mint}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-3 mb-8 text-sm">
            {invoice.memo && (
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Memo</span>
                <span className="text-foreground text-right max-w-[60%]">
                  {invoice.memo}
                </span>
              </div>
            )}
            {invoice.expiresAt && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Due date</span>
                <span className="text-foreground">
                  {formatDate(invoice.expiresAt)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Invoice ID</span>
              <span className="text-foreground font-mono text-xs">
                {truncateAddress(invoice.onchainId)}
              </span>
            </div>
          </div>

          {/* Wallet info */}
          {isConnected && (
            <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Connected</span>
                <span className="font-mono text-xs text-foreground">
                  {truncateAddress(wallet.publicKey!.toBase58())}
                </span>
              </div>
              {tokenBalance !== null && (
                <div className="flex justify-between items-center text-sm mt-1.5">
                  <span className="text-muted-foreground">
                    {invoice.mint} balance
                  </span>
                  <span className="font-mono text-xs text-foreground">
                    {tokenBalance}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action button */}
          {isConnected ? (
            <button
              onClick={handlePay}
              disabled={stage !== 'idle'}
              className="w-full btn-primary py-3.5 text-base font-semibold rounded-xl"
            >
              Pay ${invoice.amountFormatted} {invoice.mint}
            </button>
          ) : (
            <button
              onClick={() => openWalletModal(true)}
              className="w-full btn-primary py-3.5 text-base font-semibold rounded-xl inline-flex items-center justify-center gap-2"
            >
              <Wallet className="w-5 h-5" />
              Pay with Wallet
            </button>
          )}
        </div>

        <Footer />
      </div>
    </main>
  )
}
