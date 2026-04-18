import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    {
      name: 'access_token',
      value: 'e2e:onboardingDone=true',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ])
})

test.describe('Settings', () => {
  test('profile page renders with user data', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.getByDisplayValue('Alex Founder')).toBeVisible()
  })

  test('settings sub-nav has profile, billing, integrations', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('link', { name: /profile/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /billing/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /integrations/i }).first()).toBeVisible()
  })

  test('billing page shows Pro plan and price', async ({ page }) => {
    await page.goto('/settings/billing')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/pro/i).first()).toBeVisible()
    await expect(page.getByText(/\$29/)).toBeVisible()
  })

  test('integrations page shows service cards', async ({ page }) => {
    await page.goto('/settings/integrations')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('GitHub')).toBeVisible()
    await expect(page.getByText('Vercel')).toBeVisible()
    await expect(page.getByText('Notion')).toBeVisible()
  })

  test('RAG modal opens from dashboard sidebar', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.getByText(/my ai brain/i).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/upload/i).first()).toBeVisible()
  })
})
