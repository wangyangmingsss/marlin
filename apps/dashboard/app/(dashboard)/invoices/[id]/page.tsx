'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StatusBadge } from '@/components/status-badge'
import { AddressDisplay } from '@/components/address-display'
import { formatBigIntAmount } from '@marlin/shared'
import { toast } from 'sonner'
import { Copy, ExternalLink, Send, Ban, ArrowLeft, Clock } from 'lucide-react'

interface InvoiceDetail {
  id: string
  onchainId: string
  merchantId: string
  mint: string
  amount: string
  status: string
  memo?: string
  paidTxSignature?: string
  paidAt?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
  customer?: {
    id: string
    walletAddress: string
    label?: string
    email?: string
  }
  hostedCheckoutUrl?: string
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: invoice, isLoading } = useQuery<InvoiceDetail>({
    queryKey: ['invoice', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${params.id}`)
      if (!res.ok) throw new Error('Failed to fetch invoice')
      return res.json()
    },
  })

  const voidMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invoices/${params.id}/void`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to void invoice')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Invoice voided')
      queryClient.invalidateQueries({ queryKey: ['invoice', params.id] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const copyCheckoutLink = async () => {
    if (!invoice?.hostedCheckoutUrl) return
    await navigator.clipboard.writeText(invoice.hostedCheckoutUrl)
    toast.success('Checkout link copied!')
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="glass-card p-6 space-y-4">
          <div className="h-6 w-32 rounded bg-muted" />
          <div className="h-10 w-40 rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Invoice not found.</p>
        <button onClick={() => router.push('/invoices')} className="btn-primary mt-4">
          Back to Invoices
        </button>
      </div>
    )
  }

  const formattedAmount = `$${formatBigIntAmount(BigInt(invoice.amount), 6)}`

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <button onClick={() => router.push('/invoices')} className="btn-ghost -ml-3">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Invoices
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Invoice</h1>
            <StatusBadge label={invoice.status} />
          </div>
          <p className="font-mono text-sm text-muted-foreground mt-1">
            {invoice.onchainId}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{formattedAmount}</p>
          <p className="text-sm text-muted-foreground">{invoice.mint}</p>
        </div>
      </div>

      {/* Customer info */}
      <div className="glass-card p-6 space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Customer
        </h3>
        {invoice.customer ? (
          <div className="space-y-1">
            {invoice.customer.label && (
              <p className="text-lg font-medium">{invoice.customer.label}</p>
            )}
            {invoice.customer.email && (
              <p className="text-sm text-muted-foreground">{invoice.customer.email}</p>
            )}
            <AddressDisplay address={invoice.customer.walletAddress} />
          </div>
        ) : (
          <p className="text-muted-foreground">No customer linked</p>
        )}
      </div>

      {/* Details */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Details
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Created</p>
            <p>{new Date(invoice.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Due</p>
            <p>{invoice.expiresAt ? new Date(invoice.expiresAt).toLocaleString() : 'No due date'}</p>
          </div>
          {invoice.paidAt && (
            <div>
              <p className="text-muted-foreground">Paid</p>
              <p>{new Date(invoice.paidAt).toLocaleString()}</p>
            </div>
          )}
          {invoice.paidTxSignature && (
            <div>
              <p className="text-muted-foreground">Transaction</p>
              <AddressDisplay address={invoice.paidTxSignature} type="tx" chars={6} />
            </div>
          )}
        </div>
        {invoice.memo && (
          <div>
            <p className="text-sm text-muted-foreground">Memo</p>
            <p className="text-sm mt-1">{invoice.memo}</p>
          </div>
        )}
      </div>

      {/* Activity timeline */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Activity
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Invoice created</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(invoice.createdAt).toLocaleString()}
            </span>
          </div>
          {invoice.paidAt && (
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-success" />
              <span className="text-success">Payment received</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(invoice.paidAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {invoice.status === 'Open' && (
        <div className="flex gap-3">
          <button onClick={copyCheckoutLink} className="btn-secondary flex-1">
            <Copy className="mr-2 h-4 w-4" />
            Copy Payment Link
          </button>
          <button className="btn-primary flex-1">
            <Send className="mr-2 h-4 w-4" />
            Send Invoice
          </button>
          <button
            onClick={() => voidMutation.mutate()}
            disabled={voidMutation.isPending}
            className="btn-danger"
          >
            <Ban className="mr-2 h-4 w-4" />
            Void
          </button>
        </div>
      )}
    </div>
  )
}
