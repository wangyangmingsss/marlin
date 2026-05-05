'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/data-table'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState } from '@/components/empty-state'
import { formatBigIntAmount } from '@marlin/shared'
import { Plus, Layers } from 'lucide-react'

interface Plan {
  id: string
  onchainId: string
  label?: string
  mint: string
  amount: string
  intervalSeconds: number
  active: boolean
  createdAt: string
  _count?: { subscriptions: number }
}

export default function PlansPage() {
  const router = useRouter()

  const { data, isLoading } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await fetch('/api/plans')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const plans = data ?? []

  const formatInterval = (seconds: number) => {
    const days = seconds / 86400
    if (days === 30) return 'Monthly'
    if (days === 7) return 'Weekly'
    if (days === 365) return 'Yearly'
    return `Every ${days} days`
  }

  const columns = [
    {
      key: 'label',
      header: 'Plan',
      render: (row: Plan) => <span className="font-medium">{row.label || 'Unnamed'}</span>,
    },
    {
      key: 'amount',
      header: 'Price',
      render: (row: Plan) => (
        <span>${formatBigIntAmount(BigInt(row.amount), 6)} {row.mint}</span>
      ),
    },
    {
      key: 'interval',
      header: 'Interval',
      render: (row: Plan) => <span className="text-muted-foreground">{formatInterval(row.intervalSeconds)}</span>,
    },
    {
      key: 'subscribers',
      header: 'Subscribers',
      render: (row: Plan) => <span>{row._count?.subscriptions ?? 0}</span>,
    },
    {
      key: 'active',
      header: 'Status',
      render: (row: Plan) => <StatusBadge label={row.active ? 'Active' : 'Cancelled'} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
        <button onClick={() => router.push('/subscriptions/plans/new')} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" /> New Plan
        </button>
      </div>

      {!isLoading && plans.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No plans yet"
          description="Create a subscription plan to start accepting recurring payments."
          action={{ label: 'Create Plan', href: '/subscriptions/plans/new' }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={plans}
          isLoading={isLoading}
          onRowClick={(row) => router.push(`/subscriptions/plans/${row.id}`)}
        />
      )}
    </div>
  )
}
