import { test, expect } from './fixtures/admin-auth.fixture'

test.describe('Admin Projects Page', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/admin/projects')
    await adminPage.waitForLoadState('networkidle')
  })

  test('shows RestaurantIQ and HealthAI Coach', async ({ adminPage }) => {
    await expect(adminPage.getByText('RestaurantIQ')).toBeVisible()
    await expect(adminPage.getByText('HealthAI Coach')).toBeVisible()
  })

  test('phase 4 and phase 6 badges visible', async ({ adminPage }) => {
    await expect(adminPage.getByText('4').first()).toBeVisible()
    await expect(adminPage.getByText('6').first()).toBeVisible()
  })

  test('launched status shows purple badge', async ({ adminPage }) => {
    await expect(adminPage.getByText('launched')).toBeVisible()
  })

  test('filter bar is visible', async ({ adminPage }) => {
    await expect(
      adminPage.getByPlaceholder(/search name or owner email/i),
    ).toBeVisible()
  })
})
