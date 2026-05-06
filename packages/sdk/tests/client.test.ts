import { describe, it, expect } from 'vitest'
import { Marlin } from '../src/client'
import { MarlinAPIError, MarlinWebhookVerificationError, MarlinError } from '../src/errors'

describe('Marlin client constructor', () => {
  it('requires an API key', () => {
    expect(() => new Marlin({ apiKey: '' })).toThrow('API key is required')
  })

  it('creates instance with valid API key', () => {
    const client = new Marlin({ apiKey: 'mk_test_123' })
    expect(client).toBeInstanceOf(Marlin)
  })

  it('exposes resource accessors', () => {
    const client = new Marlin({ apiKey: 'mk_test_123' })
    expect(client.invoices).toBeDefined()
    expect(client.plans).toBeDefined()
    expect(client.subscriptions).toBeDefined()
    expect(client.customers).toBeDefined()
  })

  it('initializes lastRateLimit as null', () => {
    const client = new Marlin({ apiKey: 'mk_test_123' })
    expect(client.lastRateLimit).toBeNull()
  })
})

describe('MarlinError classes', () => {
  it('MarlinError has correct name', () => {
    const err = new MarlinError('test')
    expect(err.name).toBe('MarlinError')
    expect(err.message).toBe('test')
    expect(err).toBeInstanceOf(Error)
  })

  it('MarlinAPIError has correct properties', () => {
    const err = new MarlinAPIError({
      message: 'Not found',
      code: 'not_found',
      statusCode: 404,
      details: { id: 'inv_123' },
    })
    expect(err.name).toBe('MarlinAPIError')
    expect(err.message).toBe('Not found')
    expect(err.code).toBe('not_found')
    expect(err.statusCode).toBe(404)
    expect(err.details).toEqual({ id: 'inv_123' })
    expect(err).toBeInstanceOf(MarlinError)
    expect(err).toBeInstanceOf(Error)
  })

  it('MarlinAPIError defaults details to null', () => {
    const err = new MarlinAPIError({
      message: 'err',
      code: 'internal',
      statusCode: 500,
    })
    expect(err.details).toBeNull()
  })

  it('MarlinWebhookVerificationError has correct name', () => {
    const err = new MarlinWebhookVerificationError('bad sig')
    expect(err.name).toBe('MarlinWebhookVerificationError')
    expect(err).toBeInstanceOf(MarlinError)
  })
})
