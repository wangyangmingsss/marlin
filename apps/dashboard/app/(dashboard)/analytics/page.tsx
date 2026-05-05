'use client'

import { useQuery } from '@tanstack/react-query'
import { StatCard } from '@/components/stat-card'
import { RevenueChart } from '@/components/revenue-chart'
import { DollarSign, TrendingUp, RefreshCw, FileText } from 'lucide-react'

interface AnalyticsData {
  mrr: number
  totalRevenue: number
  activeSubscriptions: number
  openInvoices: number
  mrrTrend: number
  revenueTrend: number
  revenueChart: { date: string; revenue: number }[]
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/overview')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-4 w-20 rounded bg-muted mb-3" />
              <div className="h-8 w-28 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const analytics = data ?? { mrr: 0, totalRevenue: 0, activeSubscriptions: 0, openInvoices: 0, mrrTrend: 0, revenueTrend: 0, revenueChart: [] }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="MRR" value={`$${analytics.mrr.toLocaleString()}`} trend={{ value: analytics.mrrTrend, label: 'vs last month' }} icon={TrendingUp} />
        <StatCard title="Total Revenue" value={`$${analytics.totalRevenue.toLocaleString()}`} trend={{ value: analytics.revenueTrend, label: 'vs last month' }} icon={DollarSign} />
        <StatCard title="Active Subscriptions" value={analytics.activeSubscriptions.toString()} icon={RefreshCw} />
        <StatCard title="Open Invoices" value={analytics.openInvoices.toString()} icon={FileText} />
      </div>

      <RevenueChart data={analytics.revenueChart} />
    </div>
  )
}
