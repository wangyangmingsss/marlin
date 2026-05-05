'use client'

import Link from 'next/link'
import { Key, Webhook, Code2, ExternalLink } from 'lucide-react'

const devLinks = [
  {
    title: 'API Keys',
    description: 'Manage your API keys for programmatic access.',
    href: '/developers/api-keys',
    icon: Key,
  },
  {
    title: 'Webhooks',
    description: 'Configure webhook endpoints to receive real-time event notifications.',
    href: '/developers/webhooks',
    icon: Webhook,
  },
]

export default function DevelopersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Developers</h1>
        <p className="text-muted-foreground mt-1">
          Integrate Marlin into your applications with our API and webhooks.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {devLinks.map((link) => (
          <Link key={link.href} href={link.href} className="glass-card p-6 hover:border-primary/50 transition-colors group">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <link.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium group-hover:text-primary transition-colors">{link.title}</h3>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* API reference */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Quick Start</h3>
        </div>
        <div className="rounded-lg bg-background p-4 font-mono text-sm text-muted-foreground overflow-x-auto">
          <pre>{`# Create an invoice via API
curl -X POST https://api.marlin.finance/invoices \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customerWallet": "...",
    "mint": "USDC",
    "lineItems": [{ "description": "Pro Plan", "quantity": 1, "unitPrice": "29.99" }]
  }'`}</pre>
        </div>
      </div>
    </div>
  )
}
