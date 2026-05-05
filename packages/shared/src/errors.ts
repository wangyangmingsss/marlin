export const ERROR_CODES = {
  UNAUTHORIZED: { status: 401, message: 'Authentication required' },
  FORBIDDEN: { status: 403, message: 'Insufficient permissions' },
  NOT_FOUND: { status: 404, message: 'Resource not found' },
  VALIDATION_ERROR: { status: 400, message: 'Invalid input' },
  RATE_LIMITED: { status: 429, message: 'Too many requests' },
  INVOICE_NOT_FOUND: { status: 404, message: 'Invoice not found' },
  INVOICE_NOT_OPEN: { status: 400, message: 'Invoice is not in Open status' },
  INSUFFICIENT_FUNDS: { status: 400, message: 'Insufficient token balance' },
  WALLET_INVALID: { status: 400, message: 'Invalid wallet address' },
  MINT_UNSUPPORTED: { status: 400, message: 'Unsupported stablecoin mint' },
  SOLANA_TX_FAILED: { status: 500, message: 'Solana transaction failed' },
  INTERNAL: { status: 500, message: 'Internal server error' },
} as const

export type ErrorCode = keyof typeof ERROR_CODES

export function createApiError(code: ErrorCode, details?: Record<string, unknown>) {
  const def = ERROR_CODES[code]
  return {
    error: {
      code,
      message: def.message,
      details: details ?? {},
    },
  }
}

export function mapWalletError(err: unknown): string {
  const msg = String((err as any)?.message || err)
  if (msg.includes('User rejected')) return 'Transaction was canceled'
  if (msg.includes('insufficient lamports')) return 'Not enough SOL for transaction fees'
  if (msg.includes('blockhash not found')) return 'Network is busy. Please try again'
  if (msg.includes('0x1')) return 'Insufficient token balance'
  return 'Transaction failed: ' + msg
}
