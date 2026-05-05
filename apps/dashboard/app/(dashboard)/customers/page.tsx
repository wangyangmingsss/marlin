'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { AddressDisplay } from '@/components/address-display'
import { Users, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

interface Customer {
  id: string
  walletAddress: string
  email?: string
  label?: string
  createdAt: string
  _count?: { invoices: number; subscriptions: number }
}

export default function CustomersPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newWallet, setNewWallet] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newLabel, setNewLabel] = useState('')

  const { data, isLoading, refetch } = useQuery<Customer[]>({
    queryKey: ['customers', search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/customers?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const customers = data ?? []

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: newWallet, email: newEmail || undefined, label: newLabel || undefined }),
      })
      if (!res.ok) throw new Error('Failed to create customer')
      toast.success('Customer created')
      setShowCreateModal(false)
      setNewWallet('')
      setNewEmail('')
      setNewLabel('')
      refetch()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const columns = [
    {
      key: 'label',
      header: 'Name',
      render: (row: Customer) => <span className="font-medium">{row.label || '--'}</span>,
    },
    {
      key: 'wallet',
      header: 'Wallet',
      render: (row: Customer) => <AddressDisplay address={row.walletAddress} showExplorer={false} />,
    },
    {
      key: 'email',
      header: 'Email',
      render: (row: Customer) => <span className="text-muted-foreground">{row.email || '--'}</span>,
    },
    {
      key: 'invoices',
      header: 'Invoices',
      render: (row: Customer) => <span>{row._count?.invoices ?? 0}</span>,
    },
    {
      key: 'subscriptions',
      header: 'Subscriptions',
      render: (row: Customer) => <span>{row._count?.subscriptions ?? 0}</span>,
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (row: Customer) => <span className="text-sm text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" /> Add Customer
        </button>
      </div>

      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="input-base pl-9" />
      </div>

      {!isLoading && customers.length === 0 && !search ? (
        <EmptyState icon={Users} title="No customers yet" description="Customers are created automatically when you send an invoice or they subscribe." action={{ label: 'Add Customer', onClick: () => setShowCreateModal(true) }} />
      ) : (
        <DataTable columns={columns} data={customers} isLoading={isLoading} onRowClick={(row) => router.push(`/customers/${row.id}`)} />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleCreate} className="glass-card w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">Add Customer</h2>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Wallet Address *</label>
              <input type="text" value={newWallet} onChange={(e) => setNewWallet(e.target.value)} placeholder="Solana wallet address" className="input-base font-mono text-xs" required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Email</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="customer@example.com" className="input-base" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Name</label>
              <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Customer name" className="input-base" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1">Add</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
