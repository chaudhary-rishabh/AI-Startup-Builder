import { test, expect } from './fixtures/admin-auth.fixture'

test.describe('Admin Users Page', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/admin/users')
    await adminPage.waitForLoadState('networkidle')
  })

  test('renders user table with 3 mock rows', async ({ adminPage }) => {
    await expect(adminPage.getByText('Priya Sharma')).toBeVisible()
    await expect(adminPage.getByText('Marcus Chen')).toBeVisible()
    await expect(adminPage.getByText("Sarah O'Brien")).toBeVisible()
  })

  test('filter bar: search input visible', async ({ adminPage }) => {
    await expect(
      adminPage.getByPlaceholder(/search name or email/i),
    ).toBeVisible()
  })

  test('filter bar: plan dropdown present', async ({ adminPage }) => {
    await expect(adminPage.getByText(/plan: all/i)).toBeVisible()
  })

  test('status badges render correctly', async ({ adminPage }) => {
    await expect(adminPage.getByText('Active').first()).toBeVisible()
    await expect(adminPage.getByText('Unverified')).toBeVisible()
    await expect(adminPage.getByText('Suspended')).toBeVisible()
  })

  test('clicking a row opens UserDetailPanel', async ({ adminPage }) => {
    await adminPage.getByText('Priya Sharma').click()
    await expect(
      adminPage.getByText(/profile|projects|usage|billing|login/i).first(),
    ).toBeVisible()
  })

  test('detail panel has 5 tabs', async ({ adminPage }) => {
    await adminPage.getByText('Priya Sharma').click()
    await expect(adminPage.getByRole('tab', { name: /profile/i })).toBeVisible()
    await expect(adminPage.getByRole('tab', { name: /projects/i })).toBeVisible()
    await expect(adminPage.getByRole('tab', { name: /usage/i })).toBeVisible()
    await expect(adminPage.getByRole('tab', { name: /billing/i })).toBeVisible()
    await expect(adminPage.getByRole('tab', { name: /login/i })).toBeVisible()
  })

  test('checkbox selects row and shows BulkActions bar', async ({
    adminPage,
  }) => {
    const checkbox = adminPage.getByRole('checkbox').first()
    await checkbox.click()
    await expect(adminPage.getByText(/1 user selected/i)).toBeVisible()
  })

  test('actions menu opens on actions column', async ({ adminPage }) => {
    const moreBtn = adminPage.getByRole('button', { name: /actions/i }).first()
    await moreBtn.click()
    await expect(adminPage.getByText(/impersonate/i)).toBeVisible()
  })

  test('sidebar nav: Users is active', async ({ adminPage }) => {
    const usersLink = adminPage.getByTestId('nav-users')
    await expect(usersLink).toHaveClass(/bg-divider|font-medium/)
  })
})
