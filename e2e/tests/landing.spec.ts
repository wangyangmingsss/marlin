import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('loads with Marlin branding', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Marlin/)
  })

  test('displays hero content with stablecoin messaging', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('stablecoin')).toBeVisible()
  })

  test('shows key product features', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Invoices')).toBeVisible()
    await expect(page.getByText('Subscriptions')).toBeVisible()
  })

  test('has call-to-action button linking to connect', async ({ page }) => {
    await page.goto('/')
    const cta = page.locator('a, button').filter({ hasText: /Get Started|Start|Launch|Connect/i })
    await expect(cta.first()).toBeVisible()
    const href = await cta.first().getAttribute('href')
    expect(href).toContain('connect')
  })

  test('mentions supported stablecoins', async ({ page }) => {
    await page.goto('/')
    const body = await page.textContent('body')
    expect(body).toContain('USDC')
  })

  test('mentions non-custodial design', async ({ page }) => {
    await page.goto('/')
    const body = await page.textContent('body')
    expect(body!.toLowerCase()).toContain('non-custodial')
  })

  test('shows pricing model (50 bps)', async ({ page }) => {
    await page.goto('/')
    const body = await page.textContent('body')
    expect(body).toMatch(/0\.5%|50\s*bps|50\s*basis/)
  })
})

test.describe('Pricing Page', () => {
  test('pricing page loads with fee information', async ({ page }) => {
    await page.goto('/pricing')
    const body = await page.textContent('body')
    expect(body).toMatch(/0\.5%|per.*payment|no.*monthly/i)
  })
})
