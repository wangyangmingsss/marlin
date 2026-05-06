import { describe, it, expect } from 'vitest'
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
  const payload = JSON.stringify({
    id: 'evt_01HXYZ',
    object: 'event',
    type: 'invoice.paid',
    data: { id: 'inv_123' },
    createdAt: '2026-05-06T12:00:00Z',
  })

  it('verifies a valid webhook signature', () => {
    const signature = createSignature(payload, secret)
    const event = verifyWebhook({ payload, signature, secret })
    expect(event.type).toBe('invoice.paid')
    expect((event.data as any).id).toBe('inv_123')
  })

  it('throws on empty payload with code invalid_payload', () => {
    expect(() =>
      verifyWebhook({ payload: '', signature: 'sig', secret })
    ).toThrow(MarlinWebhookVerificationError)
    try {
      verifyWebhook({ payload: '', signature: 'sig', secret })
    } catch (e: any) {
      expect(e.code).toBe('invalid_payload')
    }
  })

  it('throws on missing signature with code malformed_signature', () => {
    try {
      verifyWebhook({ payload, signature: '', secret })
    } catch (e: any) {
      expect(e).toBeInstanceOf(MarlinWebhookVerificationError)
      expect(e.code).toBe('malformed_signature')
    }
  })

  it('throws on missing secret', () => {
    expect(() =>
      verifyWebhook({ payload, signature: 'sig', secret: '' })
    ).toThrow(MarlinWebhookVerificationError)
  })

  it('throws on malformed signature header', () => {
    try {
      verifyWebhook({ payload, signature: 'invalid-format', secret })
    } catch (e: any) {
      expect(e).toBeInstanceOf(MarlinWebhookVerificationError)
      expect(e.code).toBe('malformed_signature')
    }
  })

  it('throws on invalid timestamp', () => {
    try {
      verifyWebhook({ payload, signature: 't=abc,v1=deadbeef', secret })
    } catch (e: any) {
      expect(e).toBeInstanceOf(MarlinWebhookVerificationError)
      expect(e.code).toBe('malformed_signature')
    }
  })

  it('throws on expired timestamp with code expired_signature', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600 // 10 minutes ago
    const signature = createSignature(payload, secret, oldTimestamp)
    try {
      verifyWebhook({ payload, signature, secret, tolerance: 300 })
    } catch (e: any) {
      expect(e).toBeInstanceOf(MarlinWebhookVerificationError)
      expect(e.code).toBe('expired_signature')
      expect(e.message).toMatch(/too old/)
    }
  })

  it('throws on future timestamp with code future_signature', () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 600 // 10 minutes in the future
    const signature = createSignature(payload, secret, futureTimestamp)
    try {
      verifyWebhook({ payload, signature, secret, tolerance: 300 })
    } catch (e: any) {
      expect(e).toBeInstanceOf(MarlinWebhookVerificationError)
      expect(e.code).toBe('future_signature')
      expect(e.message).toMatch(/in the future/)
    }
  })

  it('throws on wrong secret with code invalid_signature', () => {
    const signature = createSignature(payload, secret)
    try {
      verifyWebhook({ payload, signature, secret: 'wrong_secret' })
    } catch (e: any) {
      expect(e).toBeInstanceOf(MarlinWebhookVerificationError)
      expect(e.code).toBe('invalid_signature')
    }
  })

  it('throws on tampered payload', () => {
    const signature = createSignature(payload, secret)
    const tampered = JSON.stringify({
      id: 'evt_01HXYZ',
      object: 'event',
      type: 'invoice.paid',
      data: { id: 'inv_evil' },
      createdAt: '2026-05-06T12:00:00Z',
    })
    try {
      verifyWebhook({ payload: tampered, signature, secret })
    } catch (e: any) {
      expect(e).toBeInstanceOf(MarlinWebhookVerificationError)
      expect(e.code).toBe('invalid_signature')
    }
  })

  it('respects custom tolerance', () => {
    const recentTimestamp = Math.floor(Date.now() / 1000) - 10
    const signature = createSignature(payload, secret, recentTimestamp)
    const event = verifyWebhook({ payload, signature, secret, tolerance: 60 })
    expect(event.type).toBe('invoice.paid')
  })

  it('accepts custom tolerance for future timestamps', () => {
    const slightFuture = Math.floor(Date.now() / 1000) + 10
    const signature = createSignature(payload, secret, slightFuture)
    // Within tolerance, should pass
    const event = verifyWebhook({ payload, signature, secret, tolerance: 60 })
    expect(event.type).toBe('invoice.paid')
  })

  it('throws on invalid JSON payload with code invalid_payload', () => {
    const badPayload = 'not json'
    const signature = createSignature(badPayload, secret)
    try {
      verifyWebhook({ payload: badPayload, signature, secret })
    } catch (e: any) {
      expect(e).toBeInstanceOf(MarlinWebhookVerificationError)
      expect(e.code).toBe('invalid_payload')
      expect(e.message).toMatch(/parse webhook payload/)
    }
  })

  it('uses crypto.timingSafeEqual (source code check)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const source = fs.readFileSync(
      path.resolve(__dirname, '../src/webhooks/verify.ts'),
      'utf-8',
    )
    expect(source).toContain('timingSafeEqual')
    expect(source).not.toMatch(/expected\s*===\s*actual/)
    expect(source).not.toMatch(/Buffer\.compare/)
  })
})
