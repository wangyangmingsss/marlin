'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StatusBadge } from '@/components/status-badge'
import { AddressDisplay } from '@/components/address-display'
import { formatBigIntAmount } from '@marlin/shared'
import { toast } from 'sonner'
import { ArrowLeft, Pause, Play, XCircle } from 'lucide-react'

interface SubscriptionDetail {
  id: string
  onchainId: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelledAt?: string
  createdAt: string
  plan: { id: string; label?: string; amount: string; mint: string; intervalSeconds: number }
  customer: { id: string; walletAddress: string; label?: string; email?: string }
  charges: {
    id: string
    amount: string
    status: string
    txSignature?: string
    periodStart: string
    periodEnd: string
    confirmedAt?: string
  }[]
}

export default function SubscriptionDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: sub, isLoading } = useQuery<SubscriptionDetail>({
    queryKey: ['subscription', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/subscriptions/${params.id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const actionMutation = useMutation({
    mutationFn: async (action: 'pause' | 'resume' | 'cancel') => {
      const res = await fetch(`/api/subscriptions/${params.id}/${action}`, { method: 'POST' })
      if (!res.ok) throw new Error(`Failed to ${action}`)
      return res.json()
    },
    onSuccess: (_, action) => {
      toast.success(`Subscription ${action}d`)
      queryClient.invalidateQueries({ queryKey: ['subscription', params.id] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) {
    return <div className="max-w-3xl mx-auto animate-pulse"><div className="h-8 w-48 rounded bg-muted" /></div>
  }

  if (!sub) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Subscription not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.push('/subscriptions')} className="btn-ghost -ml-3">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{sub.plan.label || 'Subscription'}</h1>
            <StatusBadge label={sub.status} />
          </div>
          <p className="font-mono text-sm text-muted-foreground mt-1">{sub.onchainId}</p>
        </div>
        <p className="text-2xl font-bold">
          ${formatBigIntAmount(BigInt(sub.plan.amount), 6)} {sub.plan.mint}
        </p>
      </div>

      <div className="glass-card p-6 space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Customer</h3>
        {sub.customer.label && <p className="font-medium">{sub.customer.label}</p>}
        {sub.customer.email && <p className="text-sm text-muted-foreground">{sub.customer.email}</p>}
        <AddressDisplay address={sub.customer.walletAddress} />
      </div>

      <div className="glass-card p-6 space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Billing Period</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Current Period Start</p>
            <p>{new Date(sub.currentPeriodStart).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Current Period End</p>
            <p>{new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Charges */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Charge History</h3>
        {sub.charges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No charges yet.</p>
        ) : (
          <div className="space-y-2">
            {sub.charges.map((charge) => (
              <div key={charge.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                <div>
                  <p>{new Date(charge.periodStart).toLocaleDateString()} - {new Date(charge.periodEnd).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">${formatBigIntAmount(BigInt(charge.amount), 6)}</span>
                  <StatusBadge label={charge.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {sub.status === 'Active' && (
        <div className="flex gap-3">
          <button onClick={() => actionMutation.mutate('pause')} className="btn-secondary flex-1" disabled={actionMutation.isPending}>
            <Pause className="mr-2 h-4 w-4" /> Pause
          </button>
          <button onClick={() => actionMutation.mutate('cancel')} className="btn-danger flex-1" disabled={actionMutation.isPending}>
            <XCircle className="mr-2 h-4 w-4" /> Cancel
          </button>
        </div>
      )}
      {sub.status === 'PastDue' && (
        <button onClick={() => actionMutation.mutate('resume')} className="btn-primary w-full" disabled={actionMutation.isPending}>
          <Play className="mr-2 h-4 w-4" /> Resume
        </button>
      )}
    </div>
  )
}
