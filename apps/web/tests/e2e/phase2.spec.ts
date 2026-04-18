import { expect } from '@playwright/test'

import { test } from './fixtures/auth.fixture'

test.describe.configure({ timeout: 120_000 })

const now = new Date().toISOString()
const phase2Project = {
  data: {
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
    copilotPreferences: {
      scale: 'Small SaaS',
      platform: 'Web',
      architecture: 'Serverless',
      brandFeel: 'Professional',
    },
    phase2Output: {
      prd: {
        features: [
          {
            id: 'f1',
            name: 'User Authentication',
            priority: 'Must',
            description: 'Secure login and registration with OAuth support',
            acceptanceCriteria: ['Users can sign up with email', 'Google OAuth works'],
          },
          {
            id: 'f2',
            name: 'Inventory Dashboard',
            priority: 'Must',
            description: 'Real-time view of all inventory items',
          },
        ],
        userStories: [
          {
            id: 'us1',
            role: 'restaurant owner',
            want: 'see my inventory levels in real-time',
            soThat: 'I can prevent stock-outs before they happen',
            featureId: 'f2',
          },
        ],
      },
      userFlow: {
        flowSteps: [
          { id: 's1', type: 'start', label: 'Start' },
          { id: 's2', type: 'action', label: 'Open Dashboard' },
          { id: 's3', type: 'decision', label: 'Stock low?' },
          { id: 's4', type: 'result', label: 'Create reorder alert' },
          { id: 's5', type: 'end', label: 'End' },
        ],
        dropOffPoints: [],
      },
      systemDesign: {
        techStack: [
          { category: 'frontend', name: 'Next.js 15', reasoning: 'App Router, RSC, Vercel deployment' },
          { category: 'backend', name: 'Hono + TypeScript', reasoning: 'Edge-compatible, lightweight, typed API' },
          { category: 'database', name: 'PostgreSQL + Drizzle', reasoning: 'Type-safe ORM, relational for inventory data' },
        ],
        apiEndpoints: [
          { method: 'GET', route: '/api/inventory', description: 'List all inventory items' },
          { method: 'POST', route: '/api/inventory', description: 'Create new inventory item' },
          { method: 'PATCH', route: '/api/inventory/:id', description: 'Update item quantity' },
          { method: 'DELETE', route: '/api/inventory/:id', description: 'Remove item from inventory' },
        ],
      },
      uiux: {
        wireframes: [
          {
            id: 'w1',
            name: 'Dashboard Screen',
            blocks: [
              { type: 'nav', label: 'Navigation Bar', height: 32 },
              { type: 'hero', label: 'Hero Section', height: 42 },
            ],
          },
        ],
        designSystem: {
          primaryColor: '#7C3AED',
          backgroundColor: '#F8F5FF',
          fontFamily: 'Inter',
          borderRadius: '8px',
          spacing: '4px',
        },
        componentList: ['Card'],
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
  await page.route('**/projects/proj-1', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(phase2Project),
    }),
  )
  await page.route('**/projects/proj-1/phase-data/2', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { saved: true } }) }),
  )
  await page.route('**/projects/proj-1/export', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      body: 'docx',
    }),
  )
  await page.route('**/billing/token-usage', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { tokensUsed: 1, tokenLimit: 2 } }) }),
  )
})

test('phase 2 page renders 3-panel layout', async ({ page }) => {
  await page.goto('/project/proj-1/plan')
  await expect(page.getByText('Planning Copilot 📋')).toBeVisible()
  await expect(page.getByRole('button', { name: 'PRD' })).toBeVisible()
  await expect(page.getByText('PRD Generator')).toBeVisible()
})

test('tab switch updates hash and renders flow', async ({ page }) => {
  await page.goto('/project/proj-1/plan')
  await page.getByRole('button', { name: 'User Flow' }).click()
  await expect(page).toHaveURL(/tab=flow/)
  await expect(page).toHaveURL(/#flow/)
  await expect(page.getByText('Open Dashboard')).toBeVisible()
})

test('direct hash opens correct tab', async ({ page }) => {
  await page.goto('/project/proj-1/plan#system')
  await expect(page.getByText('API Endpoints')).toBeVisible()
})

test('inline edit saves on blur', async ({ page }) => {
  await page.goto('/project/proj-1/plan')
  const editable = page.locator('[data-field="prd.features[0].name"]')
  await editable.click()
  await editable.fill('User Authentication Pro')
  await editable.blur()
  await expect(page.getByText('Saved ✓')).toBeVisible()
})

test('flow diagram connectors and system cards render', async ({ page }) => {
  await page.goto('/project/proj-1/plan#flow')
  await expect(page.locator('[data-testid="flow-connector"]').first()).toBeVisible()
  await page.getByRole('button', { name: 'System Design' }).click()
  await expect(page.getByText('Next.js 15')).toBeVisible()
  await expect(page.getByRole('cell', { name: '/api/inventory' }).first()).toBeVisible()
})

test('export docx button is visible and clickable', async ({ page }) => {
  await page.goto('/project/proj-1/plan')
  await expect(page.getByRole('button', { name: /Export DOCX/ })).toBeVisible()
  await page.getByRole('button', { name: /Export DOCX/ }).click()
})
