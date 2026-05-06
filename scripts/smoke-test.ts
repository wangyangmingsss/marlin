/**
 * Smoke test — verifies critical API endpoints are responding correctly.
 * Usage: pnpm tsx scripts/smoke-test.ts [base_url]
 */

const BASE_URL = process.argv[2] || process.env.API_BASE_URL || 'http://localhost:3000'

interface TestResult {
  name: string
  passed: boolean
  status?: number
  error?: string
}

const results: TestResult[] = []

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    results.push({ name, passed: true })
    console.log(`  ✓ ${name}`)
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message })
    console.log(`  ✗ ${name}: ${err.message}`)
  }
}

async function fetchJSON(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  return { status: res.status, body: await res.json().catch(() => null) }
}

const PROGRAM_ID = process.env.MARLIN_PROGRAM_ID || 'MRLNxMrRgKMFnHEuJPsWnbDzDRKdNHvisijd7Gg6MjZ'
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'

async function run() {
  console.log(`\nSmoke testing: ${BASE_URL}\n`)

  // ─── On-chain Program Verification ────────────────────────────────
  console.log('On-chain:')
  await check(`Program ${PROGRAM_ID} is deployed on devnet`, async () => {
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getAccountInfo',
      params: [PROGRAM_ID, { encoding: 'base64' }],
    }
    const res = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json() as any
    if (!json.result?.value) {
      throw new Error(`Account not found — program may not be deployed`)
    }
    if (!json.result.value.executable) {
      throw new Error(`Account exists but is not executable (not a program)`)
    }
  })

  console.log('')

  // ─── Health ────────────────────────────────────────────────────────
  console.log('Health:')
  await check('GET /api/health returns ok', async () => {
    const { status, body } = await fetchJSON('/api/health')
    if (status !== 200) throw new Error(`Expected 200, got ${status}`)
    if (body?.status !== 'ok' && !body?.ok) throw new Error(`Unexpected body: ${JSON.stringify(body)}`)
  })

  // ─── Auth ──────────────────────────────────────────────────────────
  console.log('\nAuth:')
  await check('GET /api/auth/nonce returns nonce', async () => {
    const { status, body } = await fetchJSON('/api/auth/nonce')
    if (status !== 200) throw new Error(`Expected 200, got ${status}`)
    if (!body?.nonce) throw new Error('Missing nonce in response')
  })

  await check('GET /api/auth/me returns 401 without session', async () => {
    const { status } = await fetchJSON('/api/auth/me')
    if (status !== 401) throw new Error(`Expected 401, got ${status}`)
  })

  await check('POST /api/auth/login rejects invalid signature', async () => {
    const { status } = await fetchJSON('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ signature: 'invalid', publicKey: '11111111111111111111111111111111' }),
    })
    if (status < 400) throw new Error(`Expected 4xx, got ${status}`)
  })

  // ─── Protected Routes Return 401 ──────────────────────────────────
  console.log('\nProtected routes (should return 401):')
  const protectedPaths = [
    '/api/invoices',
    '/api/plans',
    '/api/subscriptions',
    '/api/customers',
    '/api/analytics/overview',
    '/api/analytics/revenue-timeline',
    '/api/analytics/by-mint',
    '/api/analytics/top-customers',
    '/api/settings/webhook',
    '/api/settings/api-keys',
  ]

  for (const path of protectedPaths) {
    await check(`GET ${path} returns 401`, async () => {
      const { status } = await fetchJSON(path)
      if (status !== 401) throw new Error(`Expected 401, got ${status}`)
    })
  }

  // ─── Protected POST Routes Return 401 ─────────────────────────────
  console.log('\nProtected POST routes (should return 401):')
  await check('POST /api/invoices returns 401', async () => {
    const { status } = await fetchJSON('/api/invoices', {
      method: 'POST',
      body: JSON.stringify({ amount: '1000000', mint: 'USDC' }),
    })
    if (status !== 401) throw new Error(`Expected 401, got ${status}`)
  })

  await check('POST /api/plans returns 401', async () => {
    const { status } = await fetchJSON('/api/plans', {
      method: 'POST',
      body: JSON.stringify({ amount: '29000000', mint: 'USDC', intervalSeconds: 2592000 }),
    })
    if (status !== 401) throw new Error(`Expected 401, got ${status}`)
  })

  await check('POST /api/customers returns 401', async () => {
    const { status } = await fetchJSON('/api/customers', {
      method: 'POST',
      body: JSON.stringify({ walletAddress: '11111111111111111111111111111111' }),
    })
    if (status !== 401) throw new Error(`Expected 401, got ${status}`)
  })

  // ─── Public Endpoints ─────────────────────────────────────────────
  console.log('\nPublic endpoints:')
  await check('GET /api/public/invoice/nonexistent returns 404', async () => {
    const { status } = await fetchJSON('/api/public/invoice/nonexistent')
    if (status !== 404) throw new Error(`Expected 404, got ${status}`)
  })

  await check('GET /api/public/plan/nonexistent returns 404', async () => {
    const { status } = await fetchJSON('/api/public/plan/nonexistent')
    if (status !== 404) throw new Error(`Expected 404, got ${status}`)
  })

  await check('POST /api/public/invoice/nonexistent/build-payment-tx returns 404', async () => {
    const { status } = await fetchJSON('/api/public/invoice/nonexistent/build-payment-tx', {
      method: 'POST',
      body: JSON.stringify({ payerWallet: '11111111111111111111111111111111' }),
    })
    if (status !== 404) throw new Error(`Expected 404, got ${status}`)
  })

  // ─── OpenAPI Spec ─────────────────────────────────────────────────
  console.log('\nOpenAPI:')
  await check('GET /openapi.json returns valid spec', async () => {
    const { status, body } = await fetchJSON('/openapi.json')
    if (status !== 200) throw new Error(`Expected 200, got ${status}`)
    if (body?.openapi !== '3.0.3') throw new Error(`Expected openapi 3.0.3, got ${body?.openapi}`)
    if (!body?.paths) throw new Error('Missing paths in OpenAPI spec')
  })

  // ─── Summary ──────────────────────────────────────────────────────
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length} checks`)

  if (failed > 0) {
    console.log('\nFailed checks:')
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  ✗ ${r.name}: ${r.error}`)
    }
    process.exit(1)
  } else {
    console.log('\nAll checks passed!')
  }
}

run()
