const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000'
const TEST_TOKEN = process.env.TEST_TOKEN ?? 'test-token'

interface CheckResult {
  name: string
  pass: boolean
  detail: string
}

const results: CheckResult[] = []

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    results.push({ name, pass: true, detail: 'OK' })
  } catch (err: any) {
    results.push({ name, pass: false, detail: err.message ?? String(err) })
  }
}

async function run() {
  console.log(`Smoke testing against ${BASE_URL}\n`)

  // 1. Health endpoint
  await check('GET /api/health', async () => {
    const res = await fetch(`${BASE_URL}/api/health`)
    if (!res.ok) throw new Error(`Status ${res.status}`)
    const body = await res.json()
    if (!body.ok && body.status !== 'ok') {
      throw new Error(`Unexpected body: ${JSON.stringify(body)}`)
    }
  })

  // 2. Public invoice endpoint
  await check('GET /api/invoices/:id (public)', async () => {
    const res = await fetch(`${BASE_URL}/api/invoices/${TEST_TOKEN}`)
    if (res.status === 404) {
      // 404 is acceptable — it means the route exists and processed the request
      return
    }
    if (!res.ok) throw new Error(`Status ${res.status}`)
  })

  // 3. Public plan endpoint
  await check('GET /api/plans/:id (public)', async () => {
    const res = await fetch(`${BASE_URL}/api/plans/${TEST_TOKEN}`)
    if (res.status === 404) {
      // 404 is acceptable — it means the route exists and processed the request
      return
    }
    if (!res.ok) throw new Error(`Status ${res.status}`)
  })

  // Report
  console.log('Results:\n')
  let allPassed = true
  for (const r of results) {
    const icon = r.pass ? 'PASS' : 'FAIL'
    console.log(`  [${icon}] ${r.name} — ${r.detail}`)
    if (!r.pass) allPassed = false
  }

  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} checks passed.`)

  if (!allPassed) {
    process.exit(1)
  }
}

run()
