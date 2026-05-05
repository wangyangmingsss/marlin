'use client'

import { ArrowUp, ArrowDown, type LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: { value: number; label: string }
  icon?: LucideIcon
}

export function StatCard({ title, value, subtitle, trend, icon: Icon }: StatCardProps) {
  return (
    <div className="glass-card p-6 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <div className="flex items-center gap-2">
        {trend && (
          <span
            className={`inline-flex items-center text-xs font-medium ${
              trend.value >= 0 ? 'text-success' : 'text-danger'
            }`}
          >
            {trend.value >= 0 ? (
              <ArrowUp className="mr-0.5 h-3 w-3" />
            ) : (
              <ArrowDown className="mr-0.5 h-3 w-3" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </div>
  )
}
