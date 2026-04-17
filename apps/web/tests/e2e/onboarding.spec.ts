import { expect } from '@playwright/test'

import { test } from './fixtures/auth.fixture'

test.beforeEach(async ({ withAuthCookie }) => {
  await withAuthCookie()
})

test('Onboarding step 1 profile', async ({ page }) => {
  await page.route('**/users/profile', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { updated: true } }) }),
  )
  await page.goto('/onboarding')
  await expect(page.getByText('Tell us about yourself')).toBeVisible()
  await page.getByRole('button', { name: /continue/i }).click()
})

test('Onboarding step 2 skip to dashboard', async ({ page }) => {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
})

test('Onboarding step 3 plan cards visible', async ({ page }) => {
  await page.route('**/users/profile', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { updated: true } }) }),
  )
  await page.goto('/onboarding')
  await page.getByRole('button', { name: /continue/i }).click()
  await page.getByRole('button', { name: /continue/i }).click()
  await expect(page.getByRole('heading', { name: 'FREE' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'PRO' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'TEAM' })).toBeVisible()
})
