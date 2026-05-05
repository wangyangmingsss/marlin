'use client'

import { useEffect, useState } from 'react'
import { Loader2, Check, AlertCircle, X, Send, Hammer } from 'lucide-react'

export type TxStage =
  | 'building'
  | 'awaiting_signature'
  | 'submitting'
  | 'confirming'
  | 'confirmed'
  | 'error'

interface TxStatusModalProps {
  open: boolean
  stage: TxStage
  signature?: string
  error?: string
  onClose: () => void
  explorerUrl?: string
}

const stageConfig: Record<TxStage, { icon: React.ElementType; label: string; color: string }> = {
  building: { icon: Hammer, label: 'Building transaction...', color: 'text-primary' },
  awaiting_signature: { icon: Send, label: 'Awaiting wallet signature...', color: 'text-warning' },
  submitting: { icon: Loader2, label: 'Submitting to network...', color: 'text-primary' },
  confirming: { icon: Loader2, label: 'Confirming on-chain...', color: 'text-primary' },
  confirmed: { icon: Check, label: 'Transaction confirmed!', color: 'text-success' },
  error: { icon: AlertCircle, label: 'Transaction failed', color: 'text-danger' },
}

export function TxStatusModal({
  open,
  stage,
  signature,
  error,
  onClose,
  explorerUrl,
}: TxStatusModalProps) {
  const [canClose, setCanClose] = useState(false)
  const config = stageConfig[stage]
  const Icon = config.icon
  const isSpinning = stage === 'building' || stage === 'submitting' || stage === 'confirming'

  useEffect(() => {
    setCanClose(stage === 'confirmed' || stage === 'error')
  }, [stage])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-sm p-6 space-y-4">
        {/* Close button */}
        {canClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Stage indicator */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className={`rounded-full p-3 ${stage === 'confirmed' ? 'bg-success/10' : stage === 'error' ? 'bg-danger/10' : 'bg-primary/10'}`}>
            <Icon className={`h-8 w-8 ${config.color} ${isSpinning ? 'animate-spin' : ''}`} />
          </div>
          <p className={`text-lg font-medium ${config.color}`}>{config.label}</p>
        </div>

        {/* Progress steps */}
        <div className="space-y-2">
          {(['building', 'awaiting_signature', 'submitting', 'confirming', 'confirmed'] as TxStage[]).map((s, i) => {
            const stages: TxStage[] = ['building', 'awaiting_signature', 'submitting', 'confirming', 'confirmed']
            const currentIdx = stages.indexOf(stage)
            const stepIdx = i
            const isDone = currentIdx > stepIdx
            const isCurrent = currentIdx === stepIdx
            return (
              <div key={s} className="flex items-center gap-2 text-xs">
                <div className={`h-2 w-2 rounded-full ${isDone ? 'bg-success' : isCurrent ? 'bg-primary animate-pulse' : 'bg-border'}`} />
                <span className={isDone ? 'text-muted-foreground line-through' : isCurrent ? 'text-foreground' : 'text-muted-foreground/50'}>
                  {stageConfig[s].label.replace('...', '')}
                </span>
              </div>
            )
          })}
        </div>

        {/* Error message */}
        {stage === 'error' && error && (
          <div className="rounded-lg bg-danger/10 border border-danger/20 p-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Signature / Explorer link */}
        {signature && (
          <div className="text-center">
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                View on Solscan
              </a>
            ) : (
              <p className="font-mono text-xs text-muted-foreground truncate">{signature}</p>
            )}
          </div>
        )}

        {/* Close button for completed states */}
        {canClose && (
          <button onClick={onClose} className="btn-primary w-full">
            {stage === 'confirmed' ? 'Done' : 'Close'}
          </button>
        )}
      </div>
    </div>
  )
}
