import { expect } from '@playwright/test'

import { test } from './fixtures/auth.fixture'

const now = new Date().toISOString()
const projectPayload = {
  data: {
    id: 'proj-1',
    userId: 'u1',
    name: 'RestaurantIQ',
    emoji: '🍽️',
    description: 'AI restaurant inventory',
    currentPhase: 3,
    status: 'active',
    isStarred: true,
    mode: 'design',
    buildMode: 'copilot',
    phaseProgress: { '1': 'complete', '2': 'complete', '3': 'active' },
    phase2Output: {
      uiux: {
        wireframes: [
          { id: 'w1', name: 'Dashboard', blocks: [] },
          { id: 'w2', name: 'Inventory', blocks: [] },
          { id: 'w3', name: 'Settings', blocks: [] },
        ],
        designSystem: {
          primaryColor: '#7C3AED',
          backgroundColor: '#F8F5FF',
          fontFamily: 'Inter',
          borderRadius: '8px',
          spacing: '4px',
        },
        componentList: [],
      },
    },
    lastActiveAt: now,
    createdAt: now,
  },
}

test.beforeEach(async ({ page, context }) => {
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

  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      'canvas-store',
      JSON.stringify({
        state: {
          screens: [
            {
              screenName: 'Dashboard',
              html: '<!doctype html><html><body>Dashboard</body></html>',
              route: '/dashboard',
              generatedAt: new Date().toISOString(),
            },
            {
              screenName: 'Inventory',
              html: '<!doctype html><html><body>Inventory</body></html>',
              route: '/inventory',
              generatedAt: new Date().toISOString(),
            },
          ],
          selectedScreen: 'Dashboard',
        },
        version: 0,
      }),
    )
  })

  await page.route('**/projects/proj-1', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(projectPayload),
    }),
  )
  await page.route('**/projects/proj-1/advance-phase', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { previousPhase: 3, currentPhase: 4 } }),
    }),
  )
})

test('phase 3 design page renders toolbar + browser + frame viewer', async ({ page }) => {
  await page.goto('/project/proj-1/design')
  await expect(page.getByRole('button', { name: /Hand Off/ })).toBeVisible()
  await expect(page.getByText('Screens', { exact: true })).toBeVisible()
  await expect(page.getByTestId('frame-viewer-iframe')).toBeVisible()
})

test('screen browser shows generated and pending rows', async ({ page }) => {
  await page.goto('/project/proj-1/design')
  await expect(page.getByRole('button', { name: /Generated Dashboard/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Generated Inventory/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Generate Settings/i })).toBeVisible()
})

test('mobile viewport shows phone chrome', async ({ page }) => {
  await page.goto('/project/proj-1/design')
  await page.getByLabel('Viewport').selectOption('375')
  await expect(page.getByTestId('phone-chrome')).toBeVisible()
})

test('hand off sends advance and navigates to build', async ({ page }) => {
  await page.goto('/project/proj-1/design')
  await page.getByRole('button', { name: /Hand Off/i }).click()
  await expect(page).toHaveURL(/\/project\/proj-1\/build/)
})
