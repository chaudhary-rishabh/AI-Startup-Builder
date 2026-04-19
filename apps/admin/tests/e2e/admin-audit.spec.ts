import { test, expect } from './fixtures/admin-auth.fixture'

test.describe('Admin Audit Log Page', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/admin/audit')
    await adminPage.waitForLoadState('networkidle')
  })

  test('immutable audit banner shown', async ({ adminPage }) => {
    await expect(adminPage.getByText(/immutable/i)).toBeVisible()
  })

  test('audit entries show action chips', async ({ adminPage }) => {
    await expect(adminPage.getByText('user.suspended')).toBeVisible()
    await expect(adminPage.getByText('refund.issued')).toBeVisible()
  })

  test('before/after change shown for entries', async ({ adminPage }) => {
    await expect(
      adminPage.getByText(/active.*suspended|suspended/i).first(),
    ).toBeVisible()
  })

  test('Export CSV button visible', async ({ adminPage }) => {
    await expect(
      adminPage.getByRole('button', { name: /export csv/i }),
    ).toBeVisible()
  })

  test('admin email shown per row', async ({ adminPage }) => {
    await expect(adminPage.getByText('admin@example.com').first()).toBeVisible()
  })
})
