import { test, expect } from '@playwright/test'

test.describe('API Health', () => {
  test('GET /api/health returns ok', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBe(true)
    const body = await response.json()
    expect(body.status).toBe('ok')
  })
})

test.describe('API Auth', () => {
  test('GET /api/auth/nonce returns a nonce', async ({ request }) => {
    const response = await request.get('/api/auth/nonce')
    expect(response.ok()).toBe(true)
    const body = await response.json()
    expect(body).toHaveProperty('nonce')
  })

  test('GET /api/auth/me returns 401 without session', async ({ request }) => {
    const response = await request.get('/api/auth/me')
    expect(response.status()).toBe(401)
  })

  test('POST /api/auth/login rejects invalid signature', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        signature: 'invalid-signature',
        publicKey: '11111111111111111111111111111111',
      },
    })
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })
})

test.describe('API Protected Routes', () => {
  test('GET /api/invoices requires auth', async ({ request }) => {
    const response = await request.get('/api/invoices')
    expect(response.status()).toBe(401)
  })

  test('GET /api/customers requires auth', async ({ request }) => {
    const response = await request.get('/api/customers')
    expect(response.status()).toBe(401)
  })

  test('GET /api/subscriptions requires auth', async ({ request }) => {
    const response = await request.get('/api/subscriptions')
    expect(response.status()).toBe(401)
  })

  test('GET /api/plans requires auth', async ({ request }) => {
    const response = await request.get('/api/plans')
    expect(response.status()).toBe(401)
  })

  test('POST /api/invoices requires auth', async ({ request }) => {
    const response = await request.post('/api/invoices', {
      data: { amount: 1000000, mint: 'USDC' },
    })
    expect(response.status()).toBe(401)
  })

  test('GET /api/settings/webhook requires auth', async ({ request }) => {
    const response = await request.get('/api/settings/webhook')
    expect(response.status()).toBe(401)
  })

  test('GET /api/settings/api-keys requires auth', async ({ request }) => {
    const response = await request.get('/api/settings/api-keys')
    expect(response.status()).toBe(401)
  })
})

test.describe('API Public Endpoints', () => {
  test('GET /api/public/invoice/:token returns 404 for unknown token', async ({ request }) => {
    const response = await request.get('/api/public/invoice/unknown-token-xyz')
    expect(response.status()).toBe(404)
  })

  test('GET /api/public/plan/:slug returns 404 for unknown slug', async ({ request }) => {
    const response = await request.get('/api/public/plan/nonexistent-plan')
    expect(response.status()).toBe(404)
  })

  test('POST /api/public/invoice/:token/build-payment-tx returns 404 for unknown token', async ({ request }) => {
    const response = await request.post('/api/public/invoice/unknown-token/build-payment-tx', {
      data: { payerWallet: '11111111111111111111111111111111' },
    })
    expect(response.status()).toBe(404)
  })
})

test.describe('API Analytics', () => {
  test('GET /api/analytics/overview requires auth', async ({ request }) => {
    const response = await request.get('/api/analytics/overview')
    expect(response.status()).toBe(401)
  })

  test('GET /api/analytics/revenue-timeline requires auth', async ({ request }) => {
    const response = await request.get('/api/analytics/revenue-timeline')
    expect(response.status()).toBe(401)
  })

  test('GET /api/analytics/by-mint requires auth', async ({ request }) => {
    const response = await request.get('/api/analytics/by-mint')
    expect(response.status()).toBe(401)
  })

  test('GET /api/analytics/top-customers requires auth', async ({ request }) => {
    const response = await request.get('/api/analytics/top-customers')
    expect(response.status()).toBe(401)
  })
})
