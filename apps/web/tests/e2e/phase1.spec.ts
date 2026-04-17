import { expect } from '@playwright/test'

import { test } from './fixtures/auth.fixture'

test.describe.configure({ timeout: 120_000 })

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
  const now = new Date().toISOString()
  await page.route('**/projects/proj-1', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'proj-1',
          userId: 'u1',
          name: 'RestaurantIQ',
          emoji: '🍽️',
          description: 'AI restaurant inventory',
          currentPhase: 1,
          status: 'active',
          isStarred: true,
          mode: 'design',
          buildMode: 'copilot',
          phaseProgress: { '1': 'active' },
          lastActiveAt: now,
          createdAt: now,
        },
      }),
    }),
  )
  await page.route('**/ai/runs', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { runId: 'run-test-1', streamUrl: '/ai/runs/run-test-1/stream', status: 'running' } }),
    }),
  )
  await page.goto('/project/proj-1/validate', { waitUntil: 'domcontentloaded' })
})

test('phase1 page renders 3-panel layout', async ({ page }) => {
  await expect(page.getByText('Idea Validator 🧠')).toBeVisible()
  await expect(page.getByText('Problem & Solution')).toBeVisible()
  await expect(page.getByText('Agents')).toBeVisible()
})

test('chat input submits on enter', async ({ page }) => {
  const input = page.getByPlaceholder('Describe your startup idea...')
  await input.fill('AI-powered restaurant inventory app')
  await input.press('Enter')
})
