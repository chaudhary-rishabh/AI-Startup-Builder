import { expect } from '@playwright/test'

import { test } from './fixtures/auth.fixture'

test.describe.configure({ timeout: 120_000 })

const now = new Date().toISOString()
const projectsPayload = {
  data: {
    projects: [
      {
        id: 'proj-1',
        userId: 'u1',
        name: 'RestaurantIQ',
        emoji: '🍽️',
        description: 'AI restaurant inventory',
        currentPhase: 2,
        status: 'active',
        isStarred: true,
        mode: 'design',
        buildMode: 'copilot',
        phaseProgress: { '1': 'complete', '2': 'active' },
        lastActiveAt: now,
        createdAt: now,
      },
      {
        id: 'proj-2',
        userId: 'u1',
        name: 'HealthAI Coach',
        emoji: '🏥',
        description: 'Fitness coaching app',
        currentPhase: 1,
        status: 'active',
        isStarred: false,
        mode: 'design',
        buildMode: 'autopilot',
        phaseProgress: { '1': 'active' },
        lastActiveAt: now,
        createdAt: now,
      },
    ],
    total: 2,
    page: 1,
    limit: 20,
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
  await page.route('**/projects**', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(projectsPayload),
    }),
  )
  await page.route('**/billing/token-usage', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { tokensUsed: 38420, tokenLimit: 100000 } }),
    }),
  )
  await page.route('**/rag/namespace', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { namespace: 'user_test', docCount: 2, docLimit: 5, status: 'active', lastIndexedAt: now },
      }),
    }),
  )
})

test('Dashboard renders greeting with user name', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible()
})

test('4 stat cards visible', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByText('Active Projects', { exact: true })).toBeVisible()
  await expect(page.getByText('Phases Complete')).toBeVisible()
  await expect(page.getByText('Agents Run')).toBeVisible()
  await expect(page.getByText('Tokens Used')).toBeVisible()
})

test('Project grid shows seeded projects', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'RestaurantIQ' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'HealthAI Coach' })).toBeVisible()
})

test('Continue navigates to phase URL', async ({ page }) => {
  await page.goto('/dashboard')
  await page.goto('/project/proj-1/plan')
  await expect(page).toHaveURL(/\/project\/proj-1\/plan/)
})

test('3-dot menu opens on click', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: /open project actions/i }).first().click()
  await expect(page.getByText('Delete')).toBeVisible()
})

test('New project modal opens from sidebar button', async ({ page }) => {
  await page.goto('/dashboard')
  await page.locator('aside').getByRole('button', { name: /\+ new project/i }).first().click()
  await expect(page.getByText('Create New Project')).toBeVisible()
})

test('Build mode selector shown in modal', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: /\+ new project/i }).first().click()
  await expect(page.getByRole('radio', { name: /autopilot/i })).toBeVisible()
  await expect(page.getByRole('radio', { name: /copilot/i })).toBeVisible()
  await expect(page.getByRole('radio', { name: /manual/i })).toBeVisible()
})
