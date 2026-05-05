'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/data-table'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState } from '@/components/empty-state'
import { RefreshCw } from 'lucide-react'
import { formatBigIntAmount } from '@marlin/shared'
import Link from 'next/link'

interface Subscription {
  id: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  createdAt: string
  plan: { id: string; label?: string; amount: string; mint: string; intervalSeconds: number }
  customer: { id: string; walletAddress: string; label?: string }
}

type StatusFilter = 'all' | 'Active' | 'PastDue' | 'Cancelled' | 'Completed'
const statusFilters: StatusFilter[] = ['all', 'Active', 'PastDue', 'Cancelled', 'Completed']

export default function SubscriptionsPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data, isLoading } = useQuery<Subscription[]>({
    queryKey: ['subscriptions', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/subscriptions?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const subscriptions = data ?? []

  const formatInterval = (seconds: number) => {
    const days = seconds / 86400
    if (days === 30) return 'Monthly'
    if (days === 7) return 'Weekly'
    if (days === 365) return 'Yearly'
    return `Every ${days} days`
  }

  const columns = [
    {
      key: 'plan',
      header: 'Plan',
      render: (row: Subscription) => (
        <span className="font-medium">{row.plan.label || 'Unnamed Plan'}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row: Subscription) => (
        <span className="text-sm">{row.customer.label || row.customer.walletAddress.slice(0, 8) + '...'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: Subscription) => (
        <span>${formatBigIntAmount(BigInt(row.plan.amount), 6)} {row.plan.mint}</span>
      ),
    },
    {
      key: 'interval',
      header: 'Interval',
      render: (row: Subscription) => (
        <span className="text-muted-foreground">{formatInterval(row.plan.intervalSeconds)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Subscription) => <StatusBadge label={row.status} />,
    },
    {
      key: 'nextBilling',
      header: 'Next Billing',
      render: (row: Subscription) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.currentPeriodEnd).toLocaleDateString()}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <Link href="/subscriptions/plans" className="btn-secondary">
          Manage Plans
        </Link>
      </div>

      <div className="flex gap-2">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {!isLoading && subscriptions.length === 0 && statusFilter === 'all' ? (
        <EmptyState
          icon={RefreshCw}
          title="No subscriptions yet"
          description="Subscriptions will appear here when customers subscribe to your plans."
          action={{ label: 'Create a Plan', href: '/subscriptions/plans/new' }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={subscriptions}
          isLoading={isLoading}
          onRowClick={(row) => router.push(`/subscriptions/${row.id}`)}
        />
      )}
    </div>
  )
}
