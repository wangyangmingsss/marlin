'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AddressDisplay } from '@/components/address-display'
import { StatusBadge } from '@/components/status-badge'
import { formatBigIntAmount } from '@marlin/shared'
import { ArrowLeft } from 'lucide-react'

interface CustomerDetail {
  id: string
  walletAddress: string
  email?: string
  label?: string
  createdAt: string
  invoices: { id: string; onchainId: string; amount: string; mint: string; status: string; createdAt: string }[]
  subscriptions: { id: string; status: string; plan: { label?: string; amount: string; mint: string } }[]
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const { data: customer, isLoading } = useQuery<CustomerDetail>({
    queryKey: ['customer', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${params.id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  if (isLoading || !customer) {
    return <div className="max-w-3xl mx-auto animate-pulse"><div className="h-8 w-48 rounded bg-muted" /></div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.push('/customers')} className="btn-ghost -ml-3">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold">{customer.label || 'Customer'}</h1>
        <AddressDisplay address={customer.walletAddress} className="mt-1" />
        {customer.email && <p className="text-sm text-muted-foreground mt-1">{customer.email}</p>}
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Invoices</h3>
        {customer.invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices.</p>
        ) : (
          <div className="space-y-2">
            {customer.invoices.map((inv) => (
              <div key={inv.id} onClick={() => router.push(`/invoices/${inv.id}`)} className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded">
                <div>
                  <p className="text-sm font-mono">{inv.onchainId.slice(0, 12)}...</p>
                  <p className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">${formatBigIntAmount(BigInt(inv.amount), 6)}</span>
                  <StatusBadge label={inv.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Subscriptions</h3>
        {customer.subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscriptions.</p>
        ) : (
          <div className="space-y-2">
            {customer.subscriptions.map((sub) => (
              <div key={sub.id} onClick={() => router.push(`/subscriptions/${sub.id}`)} className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded">
                <span className="text-sm font-medium">{sub.plan.label || 'Plan'}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm">${formatBigIntAmount(BigInt(sub.plan.amount), 6)} {sub.plan.mint}</span>
                  <StatusBadge label={sub.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
