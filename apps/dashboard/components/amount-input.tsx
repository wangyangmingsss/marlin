'use client'

import { useState, useCallback, type ChangeEvent } from 'react'

interface AmountInputProps {
  value: string
  onChange: (value: string) => void
  decimals?: number
  placeholder?: string
  disabled?: boolean
  label?: string
  error?: string
}

/**
 * BigInt-safe amount input that validates decimal format.
 * Never uses floating point for amounts.
 */
export function AmountInput({
  value,
  onChange,
  decimals = 6,
  placeholder = '0.00',
  disabled = false,
  label,
  error,
}: AmountInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value

      // Allow empty
      if (raw === '') {
        onChange('')
        return
      }

      // Validate: only digits and at most one dot with up to `decimals` places
      const regex = new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`)
      if (regex.test(raw)) {
        onChange(raw)
      }
    },
    [onChange, decimals],
  )

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div
        className={`flex items-center rounded-lg border bg-input px-3 py-2 transition-colors ${
          isFocused
            ? 'border-ring ring-2 ring-ring/20'
            : error
              ? 'border-danger'
              : 'border-border'
        }`}
      >
        <span className="mr-1 text-sm text-muted-foreground">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
