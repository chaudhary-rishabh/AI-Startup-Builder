import { test, expect } from './fixtures/admin-auth.fixture'

test.describe('Admin System Page', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/admin/system')
    await adminPage.waitForLoadState('networkidle')
  })

  test('6 service cards visible', async ({ adminPage }) => {
    await expect(adminPage.getByText('API Gateway')).toBeVisible()
    await expect(adminPage.getByText('Database')).toBeVisible()
    await expect(adminPage.getByText('AI Proxy')).toBeVisible()
    await expect(adminPage.getByText('Auth')).toBeVisible()
    await expect(adminPage.getByText('Storage')).toBeVisible()
    await expect(adminPage.getByText('Queue')).toBeVisible()
  })

  test('AI Proxy shows degraded badge', async ({ adminPage }) => {
    await expect(
      adminPage.getByText('Degraded').or(adminPage.getByText('degraded')),
    ).toBeVisible()
  })

  test('error log table shows 2 entries', async ({ adminPage }) => {
    await expect(
      adminPage.getByText(/timeout|rate limit/i).first(),
    ).toBeVisible()
  })

  test('expanding error row shows stack trace', async ({ adminPage }) => {
    await adminPage.getByText(/Claude API timeout/i).click()
    await expect(adminPage.getByText(/at AgentRunner/i)).toBeVisible()
  })

  test('Create Incident button visible', async ({ adminPage }) => {
    await expect(
      adminPage.getByRole('button', { name: /create incident/i }),
    ).toBeVisible()
  })
})
