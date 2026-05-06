import { test, expect } from '@playwright/test'

test('landing page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Marlin/)
  await expect(page.getByText('stablecoin')).toBeVisible()
})

test('pricing page loads', async ({ page }) => {
  await page.goto('/pricing')
  await expect(page.getByText('Starter')).toBeVisible()
  await expect(page.getByText('Growth')).toBeVisible()
  await expect(page.getByText('Enterprise')).toBeVisible()
})
