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
    const response = await request.get('/api/auth/nonce?address=Ff4ewV5s2MqaxBHycsgRdHBy2EyC1vPLLWBW9M7HZVnr')
    expect(response.ok()).toBe(true)
    const body = await response.json()
    expect(body.data).toHaveProperty('nonce')
    expect(body.data).toHaveProperty('message')
  })

  test('GET /api/auth/me returns 401 without session', async ({ request }) => {
    const response = await request.get('/api/auth/me')
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error).toHaveProperty('code', 'UNAUTHORIZED')
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
  const protectedEndpoints = [
    { method: 'GET', path: '/api/invoices' },
    { method: 'GET', path: '/api/customers' },
    { method: 'GET', path: '/api/subscriptions' },
    { method: 'GET', path: '/api/plans' },
    { method: 'GET', path: '/api/settings/webhook' },
    { method: 'GET', path: '/api/settings/api-keys' },
    { method: 'GET', path: '/api/analytics/overview' },
    { method: 'GET', path: '/api/analytics/revenue-timeline' },
    { method: 'GET', path: '/api/analytics/by-mint' },
    { method: 'GET', path: '/api/analytics/top-customers' },
  ]

  for (const endpoint of protectedEndpoints) {
    test(`${endpoint.method} ${endpoint.path} requires auth`, async ({ request }) => {
      const response = await request.get(endpoint.path)
      expect(response.status()).toBe(401)
      const body = await response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
    })
  }

  test('POST /api/invoices requires auth', async ({ request }) => {
    const response = await request.post('/api/invoices', {
      data: { amount: 1000000, mint: 'USDC' },
    })
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error.code).toBe('UNAUTHORIZED')
  })
})

test.describe('API Public Endpoints', () => {
  test('GET /api/public/invoice/:token returns 404 for unknown token', async ({ request }) => {
    const response = await request.get('/api/public/invoice/unknown-token-xyz')
    expect(response.status()).toBe(404)
    const body = await response.json()
    expect(body.error.code).toBe('INVOICE_NOT_FOUND')
  })

  test('GET /api/public/plan/:slug returns 404 for unknown slug', async ({ request }) => {
    const response = await request.get('/api/public/plan/nonexistent-plan')
    expect(response.status()).toBe(404)
    const body = await response.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  test('POST /api/public/invoice/:token/build-payment-tx returns 404 for unknown token', async ({ request }) => {
    const response = await request.post('/api/public/invoice/unknown-token/build-payment-tx', {
      data: { payerWallet: '11111111111111111111111111111111' },
    })
    expect(response.status()).toBe(404)
    const body = await response.json()
    expect(body.error.code).toBe('INVOICE_NOT_FOUND')
  })
})
