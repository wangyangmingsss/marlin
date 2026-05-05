'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/data-table'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState } from '@/components/empty-state'
import { AddressDisplay } from '@/components/address-display'
import { FileText, Plus, Search } from 'lucide-react'
import { formatBigIntAmount } from '@marlin/shared'

type InvoiceStatus = 'all' | 'Open' | 'Paid' | 'Expired' | 'Cancelled'

interface Invoice {
  id: string
  onchainId: string
  mint: string
  amount: string
  status: string
  memo?: string
  expiresAt?: string
  createdAt: string
  customer?: { walletAddress: string; label?: string }
}

const statusFilters: InvoiceStatus[] = ['all', 'Open', 'Paid', 'Expired', 'Cancelled']

export default function InvoicesPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus>('all')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices', statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/invoices?${params}`)
      if (!res.ok) throw new Error('Failed to fetch invoices')
      return res.json()
    },
  })

  const invoices = data ?? []

  const columns = [
    {
      key: 'onchainId',
      header: 'Invoice #',
      render: (row: Invoice) => (
        <span className="font-mono text-xs">{row.onchainId.slice(0, 12)}...</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row: Invoice) =>
        row.customer ? (
          <div>
            {row.customer.label && (
              <p className="text-sm font-medium">{row.customer.label}</p>
            )}
            <AddressDisplay
              address={row.customer.walletAddress}
              showExplorer={false}
              showCopy={false}
            />
          </div>
        ) : (
          <span className="text-muted-foreground">--</span>
        ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: Invoice) => (
        <span className="font-medium">
          ${formatBigIntAmount(BigInt(row.amount), 6)} {row.mint}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Invoice) => <StatusBadge label={row.status} />,
    },
    {
      key: 'expiresAt',
      header: 'Due',
      render: (row: Invoice) =>
        row.expiresAt ? (
          <span className="text-sm text-muted-foreground">
            {new Date(row.expiresAt).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-muted-foreground">--</span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: Invoice) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <button onClick={() => router.push('/invoices/new')} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices..."
            className="input-base pl-9 w-64"
          />
        </div>
      </div>

      {/* Table or empty state */}
      {!isLoading && invoices.length === 0 && statusFilter === 'all' && !search ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Create your first invoice to start accepting stablecoin payments."
          action={{ label: 'Create Invoice', href: '/invoices/new' }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={invoices}
          isLoading={isLoading}
          onRowClick={(row) => router.push(`/invoices/${row.id}`)}
          emptyMessage="No invoices match your filters."
        />
      )}
    </div>
  )
}
