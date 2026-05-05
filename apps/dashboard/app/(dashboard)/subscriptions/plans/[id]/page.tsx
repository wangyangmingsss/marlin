'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StatusBadge } from '@/components/status-badge'
import { formatBigIntAmount } from '@marlin/shared'
import { toast } from 'sonner'
import { ArrowLeft, Copy } from 'lucide-react'

interface PlanDetail {
  id: string
  onchainId: string
  label?: string
  description?: string
  mint: string
  amount: string
  intervalSeconds: number
  active: boolean
  createdAt: string
  subscriptions: { id: string; status: string; customer: { walletAddress: string; label?: string } }[]
  checkoutUrl?: string
}

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: plan, isLoading } = useQuery<PlanDetail>({
    queryKey: ['plan', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/plans/${params.id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/plans/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !plan?.active }),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => {
      toast.success(plan?.active ? 'Plan deactivated' : 'Plan activated')
      queryClient.invalidateQueries({ queryKey: ['plan', params.id] })
    },
  })

  if (isLoading || !plan) {
    return <div className="max-w-3xl mx-auto animate-pulse"><div className="h-8 w-48 rounded bg-muted" /></div>
  }

  const formatInterval = (s: number) => {
    const days = s / 86400
    if (days === 30) return 'Monthly'
    if (days === 7) return 'Weekly'
    if (days === 365) return 'Yearly'
    return `Every ${days} days`
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.push('/subscriptions/plans')} className="btn-ghost -ml-3">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{plan.label || 'Unnamed Plan'}</h1>
            <StatusBadge label={plan.active ? 'Active' : 'Cancelled'} />
          </div>
          {plan.description && <p className="text-muted-foreground mt-1">{plan.description}</p>}
        </div>
        <p className="text-2xl font-bold">${formatBigIntAmount(BigInt(plan.amount), 6)} {plan.mint}/{formatInterval(plan.intervalSeconds).toLowerCase()}</p>
      </div>

      <div className="glass-card p-6 grid grid-cols-3 gap-4 text-sm">
        <div><p className="text-muted-foreground">Subscribers</p><p className="text-xl font-bold">{plan.subscriptions.length}</p></div>
        <div><p className="text-muted-foreground">Created</p><p>{new Date(plan.createdAt).toLocaleDateString()}</p></div>
        <div><p className="text-muted-foreground">Onchain ID</p><p className="font-mono text-xs">{plan.onchainId.slice(0, 16)}...</p></div>
      </div>

      {plan.checkoutUrl && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Checkout Link</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{plan.checkoutUrl}</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(plan.checkoutUrl!); toast.success('Copied!') }} className="btn-ghost">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => toggleMutation.mutate()} className={plan.active ? 'btn-danger' : 'btn-primary'} disabled={toggleMutation.isPending}>
          {plan.active ? 'Deactivate Plan' : 'Activate Plan'}
        </button>
      </div>
    </div>
  )
}
