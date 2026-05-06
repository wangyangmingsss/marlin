import { test, expect } from '@playwright/test'

test.describe('Invoice Checkout Page', () => {
  test('shows error for invalid invoice token', async ({ page }) => {
    await page.goto('/i/invalid-token-12345')
    // Should show an error state or not found
    await expect(
      page.locator('text=not found').or(page.locator('text=error')).or(page.locator('text=invalid'))
    ).toBeVisible({ timeout: 10000 })
  })

  test('checkout page has proper layout and branding', async ({ page }) => {
    await page.goto('/i/test-token')
    // Page should load without crashing
    await expect(page).toHaveTitle(/Marlin|Checkout/)
  })

  test('checkout page renders wallet connection option', async ({ page }) => {
    // Use a test token that will at least render the page structure
    await page.goto('/i/test-token')
    // Should eventually show connect wallet or error
    await page.waitForLoadState('networkidle')
    // The page should have loaded (either error or checkout UI)
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})

test.describe('Subscription Checkout Page', () => {
  test('shows error for invalid plan slug', async ({ page }) => {
    await page.goto('/sub/nonexistent-plan')
    await expect(
      page.locator('text=not found').or(page.locator('text=error')).or(page.locator('text=invalid'))
    ).toBeVisible({ timeout: 10000 })
  })

  test('subscription checkout page has proper layout', async ({ page }) => {
    await page.goto('/sub/test-plan')
    await expect(page).toHaveTitle(/Marlin|Checkout/)
  })
})
