'use client'

import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        open: 'bg-primary/10 text-primary',
        draft: 'bg-muted text-muted-foreground',
        paid: 'bg-success/10 text-success',
        expired: 'bg-warning/10 text-warning',
        void: 'bg-danger/10 text-danger',
        cancelled: 'bg-danger/10 text-danger',
        active: 'bg-success/10 text-success',
        past_due: 'bg-warning/10 text-warning',
        completed: 'bg-muted text-muted-foreground',
        pending: 'bg-warning/10 text-warning',
        confirmed: 'bg-success/10 text-success',
        failed: 'bg-danger/10 text-danger',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

interface StatusBadgeProps extends VariantProps<typeof badgeVariants> {
  label: string
  className?: string
}

const statusVariantMap: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
  Open: 'open',
  Draft: 'draft',
  Paid: 'paid',
  Expired: 'expired',
  Void: 'void',
  Cancelled: 'cancelled',
  Active: 'active',
  PastDue: 'past_due',
  Completed: 'completed',
  Pending: 'pending',
  Confirmed: 'confirmed',
  Failed: 'failed',
}

export function StatusBadge({ label, variant, className }: StatusBadgeProps) {
  const resolvedVariant = variant ?? statusVariantMap[label] ?? 'default'
  return (
    <span className={badgeVariants({ variant: resolvedVariant, className })}>
      {label}
    </span>
  )
}
