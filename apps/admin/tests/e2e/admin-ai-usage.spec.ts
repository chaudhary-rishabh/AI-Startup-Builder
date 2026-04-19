import { test, expect } from './fixtures/admin-auth.fixture'

test.describe('Admin AI Usage Page', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/admin/ai-usage')
    await adminPage.waitForLoadState('networkidle')
  })

  test('renders 4 overview cards', async ({ adminPage }) => {
    await expect(adminPage.getByText('Tokens Today')).toBeVisible()
    await expect(adminPage.getByText('Tokens This Month')).toBeVisible()
    await expect(adminPage.getByText('Projected Cost')).toBeVisible()
    await expect(adminPage.getByText('Cost This Month')).toBeVisible()
  })

  test('model breakdown table shows claude-sonnet-4-6', async ({
    adminPage,
  }) => {
    await expect(adminPage.getByText('claude-sonnet-4-6')).toBeVisible()
  })

  test('top users table shows Sarah O\'Brien', async ({ adminPage }) => {
    await expect(adminPage.getByText("Sarah O'Brien")).toBeVisible()
  })

  test('token limits config shows plan rows', async ({ adminPage }) => {
    await expect(adminPage.getByText('FREE').first()).toBeVisible()
    await expect(adminPage.getByText('PRO').first()).toBeVisible()
    await expect(adminPage.getByText('ENTERPRISE').first()).toBeVisible()
  })

  test('agent breakdown chart renders', async ({ adminPage }) => {
    await expect(
      adminPage.getByTestId('responsive-container').or(
        adminPage.getByText(/frontend|backend/i).first(),
      ),
    ).toBeVisible()
  })
})
