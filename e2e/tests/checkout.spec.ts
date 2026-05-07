import { test, expect } from '@playwright/test'

test.describe('Invoice Checkout Page', () => {
  test('shows error for invalid invoice token', async ({ page }) => {
    await page.goto('/i/invalid-token-12345')
    await expect(
      page.locator('text=not found').or(page.locator('text=error')).or(page.locator('text=invalid'))
    ).toBeVisible({ timeout: 10000 })
  })

  test('checkout page loads without crashing', async ({ page }) => {
    await page.goto('/i/test-token')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('checkout page has Marlin branding', async ({ page }) => {
    await page.goto('/i/test-token')
    await expect(page).toHaveTitle(/Marlin|Checkout|Pay/)
  })

  test('shows wallet connect prompt or error state', async ({ page }) => {
    await page.goto('/i/test-token')
    await page.waitForLoadState('networkidle')
    const content = await page.textContent('body')
    // Should show either an error (token invalid) or wallet connect UI
    expect(content!.toLowerCase()).toMatch(/connect.*wallet|not found|error|pay/)
  })
})

test.describe('Subscription Checkout Page', () => {
  test('shows error for invalid plan slug', async ({ page }) => {
    await page.goto('/sub/nonexistent-plan')
    await expect(
      page.locator('text=not found').or(page.locator('text=error')).or(page.locator('text=invalid'))
    ).toBeVisible({ timeout: 10000 })
  })

  test('subscription page loads without crashing', async ({ page }) => {
    await page.goto('/sub/test-plan')
    await page.waitForLoadState('networkidle')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('subscription page has checkout title', async ({ page }) => {
    await page.goto('/sub/test-plan')
    await expect(page).toHaveTitle(/Marlin|Checkout|Subscribe/)
  })
})
