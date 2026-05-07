import { test, expect } from '@playwright/test'

test.describe('Dashboard Auth Guards', () => {
  const protectedPaths = [
    '/dashboard',
    '/invoices',
    '/invoices/new',
    '/subscriptions',
    '/subscriptions/plans',
    '/customers',
    '/settings',
    '/analytics',
    '/developers',
  ]

  for (const path of protectedPaths) {
    test(`${path} redirects to /connect without auth`, async ({ page }) => {
      await page.goto(path)
      await page.waitForURL(/\/connect/, { timeout: 5000 })
      expect(page.url()).toContain('/connect')
    })
  }
})

test.describe('Connect Wallet Page', () => {
  test('renders wallet connect button', async ({ page }) => {
    await page.goto('/connect')
    await expect(page.locator('text=Connect')).toBeVisible()
  })

  test('shows Marlin branding', async ({ page }) => {
    await page.goto('/connect')
    await expect(page.locator('text=Marlin')).toBeVisible()
  })

  test('displays security messaging', async ({ page }) => {
    await page.goto('/connect')
    const body = await page.textContent('body')
    expect(body!.toLowerCase()).toMatch(/non-custodial|no.*password|secure/)
  })

  test('has sign-in with Solana flow description', async ({ page }) => {
    await page.goto('/connect')
    const body = await page.textContent('body')
    expect(body!.toLowerCase()).toMatch(/solana|wallet/)
  })
})

test.describe('Marketing Pages', () => {
  test('landing page hero mentions stablecoin', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=stablecoin')).toBeVisible()
  })

  test('landing page lists Invoices and Subscriptions features', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Invoices')).toBeVisible()
    await expect(page.locator('text=Subscriptions')).toBeVisible()
  })

  test('landing page has visible CTA', async ({ page }) => {
    await page.goto('/')
    const cta = page.locator('a, button').filter({ hasText: /Get Started|Start|Launch/i })
    await expect(cta.first()).toBeVisible()
  })
})
