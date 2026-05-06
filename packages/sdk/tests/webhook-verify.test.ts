import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyWebhook } from '../src/webhooks/verify'
import { MarlinWebhookVerificationError } from '../src/errors'

function createSignature(payload: string, secret: string, timestamp?: number): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000)
  const hmac = createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex')
  return `t=${ts},v1=${hmac}`
}

describe('verifyWebhook', () => {
  const secret = 'whsec_test_secret_key'
  const payload = JSON.stringify({ type: 'invoice.paid', data: { id: 'inv_123' } })

  it('verifies a valid webhook signature', () => {
    const signature = createSignature(payload, secret)
    const event = verifyWebhook({ payload, signature, secret })
    expect(event.type).toBe('invoice.paid')
    expect(event.data.id).toBe('inv_123')
  })

  it('throws on empty payload', () => {
    expect(() =>
      verifyWebhook({ payload: '', signature: 'sig', secret })
    ).toThrow(MarlinWebhookVerificationError)
  })

  it('throws on missing signature', () => {
    expect(() =>
      verifyWebhook({ payload, signature: '', secret })
    ).toThrow(MarlinWebhookVerificationError)
  })

  it('throws on missing secret', () => {
    expect(() =>
      verifyWebhook({ payload, signature: 'sig', secret: '' })
    ).toThrow(MarlinWebhookVerificationError)
  })

  it('throws on malformed signature header', () => {
    expect(() =>
      verifyWebhook({ payload, signature: 'invalid-format', secret })
    ).toThrow(MarlinWebhookVerificationError)
  })

  it('throws on invalid timestamp', () => {
    expect(() =>
      verifyWebhook({ payload, signature: 't=abc,v1=deadbeef', secret })
    ).toThrow(MarlinWebhookVerificationError)
  })

  it('throws on expired timestamp', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600 // 10 minutes ago
    const signature = createSignature(payload, secret, oldTimestamp)
    expect(() =>
      verifyWebhook({ payload, signature, secret, tolerance: 300 })
    ).toThrow(/too old/)
  })

  it('throws on wrong secret', () => {
    const signature = createSignature(payload, secret)
    expect(() =>
      verifyWebhook({ payload, signature, secret: 'wrong_secret' })
    ).toThrow(/signature verification failed/)
  })

  it('throws on tampered payload', () => {
    const signature = createSignature(payload, secret)
    const tampered = JSON.stringify({ type: 'invoice.paid', data: { id: 'inv_evil' } })
    expect(() =>
      verifyWebhook({ payload: tampered, signature, secret })
    ).toThrow(/signature verification failed/)
  })

  it('respects custom tolerance', () => {
    const recentTimestamp = Math.floor(Date.now() / 1000) - 10
    const signature = createSignature(payload, secret, recentTimestamp)
    // Should pass with 60s tolerance
    const event = verifyWebhook({ payload, signature, secret, tolerance: 60 })
    expect(event.type).toBe('invoice.paid')
  })

  it('throws on invalid JSON payload', () => {
    const badPayload = 'not json'
    const signature = createSignature(badPayload, secret)
    expect(() =>
      verifyWebhook({ payload: badPayload, signature, secret })
    ).toThrow(/parse webhook payload/)
  })
})
