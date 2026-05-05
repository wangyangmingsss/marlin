'use client'

import { useState } from 'react'
import { truncateAddress, solscanUrl } from '@marlin/shared'
import { Copy, ExternalLink, Check } from 'lucide-react'

interface AddressDisplayProps {
  address: string
  chars?: number
  showCopy?: boolean
  showExplorer?: boolean
  type?: 'account' | 'tx'
  cluster?: string
  className?: string
}

export function AddressDisplay({
  address,
  chars = 4,
  showCopy = true,
  showExplorer = true,
  type = 'account',
  cluster = 'devnet',
  className = '',
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-sm ${className}`}>
      <span className="text-muted-foreground">{truncateAddress(address, chars)}</span>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Copy address"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      )}
      {showExplorer && (
        <a
          href={solscanUrl(address, type, cluster)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="View on Solscan"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </span>
  )
}
