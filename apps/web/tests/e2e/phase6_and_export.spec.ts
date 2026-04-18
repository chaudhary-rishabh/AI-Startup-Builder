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

test.describe('Phase 6 — Growth', () => {
  test('body is not forced to Slate 950 dev background', async ({ page }) => {
    await page.goto('/project/proj-1/growth')
    await page.waitForLoadState('networkidle')
    const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor)
    expect(bg).not.toMatch(/15.*23.*42/)
  })

  test('chat input area is visible', async ({ page }) => {
    await page.goto('/project/proj-1/growth')
    await page.waitForLoadState('networkidle')
    await expect(page.getByPlaceholder(/ask about/i).or(page.locator('textarea').first())).toBeVisible()
  })
})

test.describe('Export page', () => {
  test('export options are visible', async ({ page }) => {
    await page.goto('/project/proj-1/export')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/prd|docx|export/i).first()).toBeVisible()
    await expect(page.getByText(/zip|code/i).first()).toBeVisible()
  })

  test('Download triggers loading state', async ({ page }) => {
    await page.goto('/project/proj-1/export')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /download/i }).first().click()
    await expect(page.getByText(/preparing|download|processing/i).first()).toBeVisible({ timeout: 5000 })
  })
})
