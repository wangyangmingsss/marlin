'use client'

import { type MintSymbol } from '@marlin/shared'

interface MintSelectorProps {
  value: MintSymbol
  onChange: (mint: MintSymbol) => void
  disabled?: boolean
}

const mints: { symbol: MintSymbol; label: string; color: string }[] = [
  { symbol: 'USDC', label: 'USDC', color: '#2775CA' },
  { symbol: 'PYUSD', label: 'PYUSD', color: '#0066DD' },
  { symbol: 'USDG', label: 'USDG', color: '#10B981' },
]

export function MintSelector({ value, onChange, disabled }: MintSelectorProps) {
  return (
    <div className="flex gap-2">
      {mints.map((m) => (
        <button
          key={m.symbol}
          type="button"
          disabled={disabled}
          onClick={() => onChange(m.symbol)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            value === m.symbol
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground hover:border-muted-foreground'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: m.color }}
          />
          {m.label}
        </button>
      ))}
    </div>
  )
}
