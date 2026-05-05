'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Key, Plus, Trash2, Copy, Eye, EyeOff } from 'lucide-react'

interface ApiKeyItem {
  id: string
  label?: string
  keyPrefix: string
  lastUsedAt?: string
  createdAt: string
}

export default function ApiKeysPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)

  const { data: keys, isLoading } = useQuery<ApiKeyItem[]>({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const res = await fetch('/api/settings/api-keys')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel || undefined }),
      })
      if (!res.ok) throw new Error('Failed to create')
      return res.json()
    },
    onSuccess: (data) => {
      setNewKey(data.key)
      setNewLabel('')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settings/api-keys/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to revoke')
    },
    onSuccess: () => {
      toast.success('API key revoked')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground mt-1">Manage your API keys for programmatic access.</p>
        </div>
        <button onClick={() => { setShowCreate(true); setNewKey(null) }} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" /> Create Key
        </button>
      </div>

      {/* New key display */}
      {newKey && (
        <div className="glass-card p-6 border-success/30 space-y-3">
          <p className="text-sm font-medium text-success">New API key created. Copy it now - it will not be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-background p-3 font-mono text-sm break-all">
              {showKey ? newKey : newKey.slice(0, 12) + '...' + newKey.slice(-4)}
            </code>
            <button onClick={() => setShowKey(!showKey)} className="btn-ghost p-2">
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Copied!') }} className="btn-ghost p-2">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && !newKey && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-medium">Create API Key</h3>
          <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Key label (optional)" className="input-base" />
          <div className="flex gap-3">
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Key list */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded bg-muted" />)}
          </div>
        ) : (keys ?? []).length === 0 ? (
          <div className="p-8 text-center">
            <Key className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No API keys yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(keys ?? []).map((key) => (
              <div key={key.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{key.label || 'Unnamed Key'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{key.keyPrefix}...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && ` | Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => revokeMutation.mutate(key.id)}
                  disabled={revokeMutation.isPending}
                  className="btn-ghost text-danger hover:text-danger p-2"
                  title="Revoke"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
