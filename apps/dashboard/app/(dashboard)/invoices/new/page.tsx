'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import { MintSelector } from '@/components/mint-selector'
import { AmountInput } from '@/components/amount-input'
import { TxStatusModal, type TxStage } from '@/components/tx-status-modal'
import { type MintSymbol } from '@marlin/shared'
import { Plus, Trash2 } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unitPrice: string
}

export default function NewInvoicePage() {
  const router = useRouter()
  const { publicKey, signTransaction } = useWallet()

  const [customerWallet, setCustomerWallet] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerLabel, setCustomerLabel] = useState('')
  const [mint, setMint] = useState<MintSymbol>('USDC')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: '' },
  ])
  const [taxBps, setTaxBps] = useState('')
  const [memo, setMemo] = useState('')
  const [dueDate, setDueDate] = useState('')

  // Tx status
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txStage, setTxStage] = useState<TxStage>('building')
  const [txSignature, setTxSignature] = useState<string>()
  const [txError, setTxError] = useState<string>()

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: '' }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const calculateTotal = (): string => {
    let total = 0
    for (const item of lineItems) {
      const price = parseFloat(item.unitPrice) || 0
      total += price * item.quantity
    }
    const tax = taxBps ? total * (parseInt(taxBps) / 10000) : 0
    return (total + tax).toFixed(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey || !signTransaction) {
      toast.error('Wallet not connected')
      return
    }

    setTxModalOpen(true)
    setTxStage('building')
    setTxError(undefined)
    setTxSignature(undefined)

    try {
      // 1. Create invoice via API
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerWallet,
          customerEmail: customerEmail || undefined,
          customerLabel: customerLabel || undefined,
          mint,
          lineItems: lineItems.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
          })),
          taxBps: taxBps ? parseInt(taxBps) : 0,
          memo: memo || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Failed to create invoice')
      }

      const { invoice, unsignedTx } = await res.json()

      // 2. Sign transaction
      setTxStage('awaiting_signature')
      const { Transaction } = await import('@solana/web3.js')
      const tx = Transaction.from(Buffer.from(unsignedTx, 'base64'))
      const signed = await signTransaction(tx)

      // 3. Submit
      setTxStage('submitting')
      const { Connection } = await import('@solana/web3.js')
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      )
      const sig = await connection.sendRawTransaction(signed.serialize())
      setTxSignature(sig)

      // 4. Confirm
      setTxStage('confirming')
      await connection.confirmTransaction(sig, 'confirmed')

      // 5. Notify backend
      await fetch(`/api/tx/${sig}/confirm`, { method: 'POST' })

      setTxStage('confirmed')
      toast.success('Invoice created successfully!')
      setTimeout(() => router.push(`/invoices/${invoice.id}`), 1500)
    } catch (err: any) {
      setTxStage('error')
      setTxError(err?.message || 'Transaction failed')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Create Invoice</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer info */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-medium">Customer</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-sm font-medium">Wallet Address *</label>
              <input
                type="text"
                value={customerWallet}
                onChange={(e) => setCustomerWallet(e.target.value)}
                placeholder="Solana wallet address"
                className="input-base font-mono text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
                className="input-base"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Name / Label</label>
              <input
                type="text"
                value={customerLabel}
                onChange={(e) => setCustomerLabel(e.target.value)}
                placeholder="Customer name"
                className="input-base"
              />
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-medium">Payment</h2>
          <div>
            <label className="block text-sm font-medium mb-2">Stablecoin</label>
            <MintSelector value={mint} onChange={setMint} />
          </div>
        </div>

        {/* Line items */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Line Items</h2>
            <button type="button" onClick={addLineItem} className="btn-ghost text-sm">
              <Plus className="mr-1 h-4 w-4" />
              Add Item
            </button>
          </div>

          {lineItems.map((item, idx) => (
            <div key={idx} className="flex gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                  placeholder="Item description"
                  className="input-base"
                  required
                />
              </div>
              <div className="w-20 space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Qty</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                  min={1}
                  className="input-base"
                  required
                />
              </div>
              <div className="w-32">
                <AmountInput
                  label="Unit Price"
                  value={item.unitPrice}
                  onChange={(v) => updateLineItem(idx, 'unitPrice', v)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeLineItem(idx)}
                disabled={lineItems.length <= 1}
                className="btn-ghost p-2 text-muted-foreground hover:text-danger disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Options */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-medium">Options</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Tax Rate (bps)</label>
              <input
                type="number"
                value={taxBps}
                onChange={(e) => setTaxBps(e.target.value)}
                placeholder="0"
                min={0}
                max={10000}
                className="input-base"
              />
              <p className="text-xs text-muted-foreground">100 bps = 1%</p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-base"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Memo</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Optional note for the customer"
              rows={3}
              className="input-base resize-none"
              maxLength={500}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span>${calculateTotal()} {mint}</span>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" className="btn-primary w-full py-3 text-base">
          Create Invoice
        </button>
      </form>

      <TxStatusModal
        open={txModalOpen}
        stage={txStage}
        signature={txSignature}
        error={txError}
        onClose={() => {
          setTxModalOpen(false)
          if (txStage === 'confirmed') router.push('/invoices')
        }}
      />
    </div>
  )
}
