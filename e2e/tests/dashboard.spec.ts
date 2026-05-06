import { test, expect } from '@playwright/test'

test.describe('Dashboard Navigation', () => {
  test('dashboard page requires authentication', async ({ page }) => {
    await page.goto('/dashboard')
    // Should redirect to connect page when not authenticated
    await expect(page).toHaveURL(/connect/)
  })

  test('invoices page requires authentication', async ({ page }) => {
    await page.goto('/invoices')
    await expect(page).toHaveURL(/connect/)
  })

  test('subscriptions page requires authentication', async ({ page }) => {
    await page.goto('/subscriptions')
    await expect(page).toHaveURL(/connect/)
  })

  test('customers page requires authentication', async ({ page }) => {
    await page.goto('/customers')
    await expect(page).toHaveURL(/connect/)
  })

  test('settings page requires authentication', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/connect/)
  })
})

test.describe('Connect Wallet Page', () => {
  test('connect page renders wallet button', async ({ page }) => {
    await page.goto('/connect')
    await expect(page.locator('text=Connect')).toBeVisible()
  })

  test('connect page has proper layout', async ({ page }) => {
    await page.goto('/connect')
    await expect(page.locator('text=Marlin')).toBeVisible()
  })
})

test.describe('Marketing Pages', () => {
  test('landing page has hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=stablecoin')).toBeVisible()
  })

  test('landing page has feature sections', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Invoices')).toBeVisible()
    await expect(page.locator('text=Subscriptions')).toBeVisible()
  })

  test('landing page has call-to-action', async ({ page }) => {
    await page.goto('/')
    // Should have a button or link to get started
    const cta = page.locator('a, button').filter({ hasText: /Get Started|Start|Launch/i })
    await expect(cta.first()).toBeVisible()
  })
})
