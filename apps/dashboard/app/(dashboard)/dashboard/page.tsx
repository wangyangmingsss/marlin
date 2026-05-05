'use client'

import { useQuery } from '@tanstack/react-query'
import { StatCard } from '@/components/stat-card'
import { RevenueChart } from '@/components/revenue-chart'
import { StatusBadge } from '@/components/status-badge'
import { DollarSign, TrendingUp, RefreshCw, FileText, Clock } from 'lucide-react'

interface OverviewData {
  mrr: number
  totalRevenue: number
  activeSubscriptions: number
  openInvoices: number
  mrrTrend: number
  revenueTrend: number
  revenueChart: { date: string; revenue: number }[]
  recentActivity: {
    id: string
    type: string
    description: string
    amount?: string
    status: string
    createdAt: string
  }[]
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/overview')
      if (!res.ok) throw new Error('Failed to fetch overview')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-4 w-20 rounded bg-muted mb-3" />
              <div className="h-8 w-28 rounded bg-muted mb-2" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="glass-card p-6 animate-pulse h-[360px]" />
      </div>
    )
  }

  const overview = data ?? {
    mrr: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    openInvoices: 0,
    mrrTrend: 0,
    revenueTrend: 0,
    revenueChart: [],
    recentActivity: [],
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monthly Recurring Revenue"
          value={`$${overview.mrr.toLocaleString()}`}
          trend={{ value: overview.mrrTrend, label: 'vs last month' }}
          subtitle="vs last month"
          icon={TrendingUp}
        />
        <StatCard
          title="Total Revenue"
          value={`$${overview.totalRevenue.toLocaleString()}`}
          trend={{ value: overview.revenueTrend, label: 'vs last month' }}
          subtitle="all time"
          icon={DollarSign}
        />
        <StatCard
          title="Active Subscriptions"
          value={overview.activeSubscriptions.toString()}
          subtitle="currently active"
          icon={RefreshCw}
        />
        <StatCard
          title="Open Invoices"
          value={overview.openInvoices.toString()}
          subtitle="awaiting payment"
          icon={FileText}
        />
      </div>

      {/* Revenue chart */}
      <RevenueChart data={overview.revenueChart} />

      {/* Recent activity */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-medium mb-4">Recent Activity</h3>
        {overview.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No recent activity. Create an invoice or subscription to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {overview.recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.amount && (
                    <span className="text-sm font-medium">{item.amount}</span>
                  )}
                  <StatusBadge label={item.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
