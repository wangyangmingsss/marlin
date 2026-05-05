'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import { MintSelector } from '@/components/mint-selector'
import { AmountInput } from '@/components/amount-input'
import { TxStatusModal, type TxStage } from '@/components/tx-status-modal'
import { type MintSymbol } from '@marlin/shared'

const intervals = [
  { label: 'Weekly', seconds: 604800 },
  { label: 'Monthly', seconds: 2592000 },
  { label: 'Yearly', seconds: 31536000 },
]

export default function NewPlanPage() {
  const router = useRouter()
  const { publicKey, signTransaction } = useWallet()

  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [mint, setMint] = useState<MintSymbol>('USDC')
  const [amount, setAmount] = useState('')
  const [intervalSeconds, setIntervalSeconds] = useState(2592000)

  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txStage, setTxStage] = useState<TxStage>('building')
  const [txSignature, setTxSignature] = useState<string>()
  const [txError, setTxError] = useState<string>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey || !signTransaction) {
      toast.error('Wallet not connected')
      return
    }

    setTxModalOpen(true)
    setTxStage('building')
    setTxError(undefined)

    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, description: description || undefined, mint, amount, intervalSeconds }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Failed to create plan')
      }

      const { plan, unsignedTx } = await res.json()

      setTxStage('awaiting_signature')
      const { Transaction } = await import('@solana/web3.js')
      const tx = Transaction.from(Buffer.from(unsignedTx, 'base64'))
      const signed = await signTransaction(tx)

      setTxStage('submitting')
      const { Connection } = await import('@solana/web3.js')
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com')
      const sig = await connection.sendRawTransaction(signed.serialize())
      setTxSignature(sig)

      setTxStage('confirming')
      await connection.confirmTransaction(sig, 'confirmed')
      await fetch(`/api/tx/${sig}/confirm`, { method: 'POST' })

      setTxStage('confirmed')
      toast.success('Plan created!')
      setTimeout(() => router.push(`/subscriptions/plans/${plan.id}`), 1500)
    } catch (err: any) {
      setTxStage('error')
      setTxError(err?.message || 'Transaction failed')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Create Subscription Plan</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-card p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Plan Name *</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., Pro Monthly" className="input-base" required maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's included in this plan?" rows={3} className="input-base resize-none" maxLength={500} />
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Stablecoin</label>
            <MintSelector value={mint} onChange={setMint} />
          </div>
          <AmountInput label="Price per period *" value={amount} onChange={setAmount} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Billing Interval</label>
            <div className="flex gap-2">
              {intervals.map((iv) => (
                <button
                  key={iv.seconds}
                  type="button"
                  onClick={() => setIntervalSeconds(iv.seconds)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    intervalSeconds === iv.seconds
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-muted-foreground'
                  }`}
                >
                  {iv.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-3">Create Plan</button>
      </form>

      <TxStatusModal
        open={txModalOpen}
        stage={txStage}
        signature={txSignature}
        error={txError}
        onClose={() => { setTxModalOpen(false); if (txStage === 'confirmed') router.push('/subscriptions/plans') }}
      />
    </div>
  )
}
