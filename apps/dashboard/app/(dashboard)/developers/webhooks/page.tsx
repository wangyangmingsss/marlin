'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Webhook, Save, TestTube } from 'lucide-react'

interface WebhookConfig {
  webhookUrl: string | null
}

export default function WebhooksPage() {
  const queryClient = useQueryClient()
  const [url, setUrl] = useState('')
  const [initialized, setInitialized] = useState(false)

  const { isLoading } = useQuery<WebhookConfig>({
    queryKey: ['webhook-config'],
    queryFn: async () => {
      const res = await fetch('/api/settings/webhook')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      if (!initialized) {
        setUrl(data.webhookUrl || '')
        setInitialized(true)
      }
      return data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/webhook', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: url || null }),
      })
      if (!res.ok) throw new Error('Failed to save')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Webhook URL saved')
      queryClient.invalidateQueries({ queryKey: ['webhook-config'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const events = [
    { event: 'invoice.paid', description: 'Fired when an invoice payment is confirmed on-chain.' },
    { event: 'invoice.expired', description: 'Fired when an invoice expires without payment.' },
    { event: 'subscription.created', description: 'Fired when a new subscription is created.' },
    { event: 'subscription.charged', description: 'Fired when a recurring charge is confirmed.' },
    { event: 'subscription.cancelled', description: 'Fired when a subscription is cancelled.' },
    { event: 'subscription.past_due', description: 'Fired when a charge attempt fails.' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <p className="text-muted-foreground mt-1">Receive real-time notifications when events occur.</p>
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Endpoint URL</h3>
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-app.com/api/webhooks/marlin"
          className="input-base"
          disabled={isLoading}
        />
        <div className="flex gap-3">
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary">
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
          <button className="btn-secondary" disabled>
            <TestTube className="mr-2 h-4 w-4" /> Send Test
          </button>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-medium">Supported Events</h3>
        <div className="divide-y divide-border">
          {events.map((ev) => (
            <div key={ev.event} className="py-3 first:pt-0 last:pb-0">
              <code className="text-sm text-primary font-mono">{ev.event}</code>
              <p className="text-sm text-muted-foreground mt-0.5">{ev.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
