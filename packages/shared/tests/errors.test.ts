import { describe, it, expect } from 'vitest'
import { createApiError, mapWalletError, ERROR_CODES } from '../src/errors'

describe('createApiError', () => {
  it('creates error with correct code and message', () => {
    const err = createApiError('UNAUTHORIZED')
    expect(err.error.code).toBe('UNAUTHORIZED')
    expect(err.error.message).toBe('Authentication required')
    expect(err.error.details).toEqual({})
  })

  it('includes details when provided', () => {
    const err = createApiError('VALIDATION_ERROR', { field: 'amount', reason: 'must be positive' })
    expect(err.error.code).toBe('VALIDATION_ERROR')
    expect(err.error.details).toEqual({ field: 'amount', reason: 'must be positive' })
  })

  it('handles all error codes', () => {
    for (const code of Object.keys(ERROR_CODES) as Array<keyof typeof ERROR_CODES>) {
      const err = createApiError(code)
      expect(err.error.code).toBe(code)
      expect(err.error.message).toBe(ERROR_CODES[code].message)
    }
  })
})

describe('mapWalletError', () => {
  it('maps user rejection', () => {
    expect(mapWalletError(new Error('User rejected the request'))).toBe('Transaction was canceled')
  })

  it('maps insufficient lamports', () => {
    expect(mapWalletError(new Error('insufficient lamports for rent'))).toBe('Not enough SOL for transaction fees')
  })

  it('maps blockhash not found', () => {
    expect(mapWalletError(new Error('blockhash not found'))).toBe('Network is busy. Please try again')
  })

  it('maps 0x1 error code', () => {
    expect(mapWalletError(new Error('custom program error: 0x1'))).toBe('Insufficient token balance')
  })

  it('returns generic message for unknown errors', () => {
    const result = mapWalletError(new Error('something weird'))
    expect(result).toContain('Transaction failed')
    expect(result).toContain('something weird')
  })

  it('handles non-Error objects', () => {
    const result = mapWalletError('string error')
    expect(result).toContain('Transaction failed')
  })
})
