import { test, expect } from './fixtures/admin-auth.fixture'

test.describe('Admin Billing Page', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/admin/billing')
    await adminPage.waitForLoadState('networkidle')
  })

  test('revenue summary shows MRR as $24,800', async ({ adminPage }) => {
    await expect(adminPage.getByText('$24,800')).toBeVisible()
  })

  test('revenue summary shows ARR', async ({ adminPage }) => {
    await expect(adminPage.getByText('$297,600')).toBeVisible()
  })

  test('plan manager shows Free and Pro plans', async ({ adminPage }) => {
    await expect(adminPage.getByText('Free').first()).toBeVisible()
    await expect(adminPage.getByText('Pro').first()).toBeVisible()
  })

  test('transactions table shows Priya Sharma row', async ({ adminPage }) => {
    await expect(adminPage.getByText('Priya Sharma')).toBeVisible()
    await expect(adminPage.getByText('$29')).toBeVisible()
  })

  test('coupon LAUNCH50 visible in coupon manager', async ({ adminPage }) => {
    await expect(adminPage.getByText('LAUNCH50')).toBeVisible()
    await expect(adminPage.getByText(/50% off/i)).toBeVisible()
  })

  test('Export CSV button visible on transactions', async ({ adminPage }) => {
    await expect(
      adminPage.getByRole('button', { name: /export csv/i }).first(),
    ).toBeVisible()
  })
})
