import { expect } from '@playwright/test'

import { test } from './fixtures/auth.fixture'

const now = new Date().toISOString()

const phase4Project = {
  data: {
    id: 'proj-1',
    userId: 'u1',
    name: 'RestaurantIQ',
    emoji: '🍽️',
    description: 'AI restaurant inventory',
    currentPhase: 4,
    status: 'active',
    isStarred: true,
    mode: 'design',
    buildMode: 'copilot',
    phaseProgress: { '1': 'complete', '2': 'complete', '3': 'complete', '4': 'active' },
    lastActiveAt: now,
    createdAt: now,
  },
}

const mockFiles = {
  data: [
    {
      id: 'file-1',
      projectId: 'proj-1',
      path: '/src/schema/user.ts',
      content: 'export const x = 1;\n',
      language: 'typescript',
      agentType: 'schema',
      isModified: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'file-2',
      projectId: 'proj-1',
      path: '/src/routes/auth.ts',
      content: 'export const y = 2;\n',
      language: 'typescript',
      agentType: 'backend',
      isModified: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
}

const generationPlan = {
  data: {
    totalFiles: 32,
    totalBatches: 6,
    estimatedMs: 28000,
    fileList: ['/src/schema/user.ts'],
    agentBreakdown: [
      { agentType: 'schema', fileCount: 4 },
      { agentType: 'backend', fileCount: 14 },
    ],
  },
}

function sseBody(): string {
  const runId = 'run-schema-1'
  const lines = [
    `event: batch_start\ndata: ${JSON.stringify({ type: 'batch_start', batchNumber: 1, totalBatches: 2, agentType: 'schema_gen', fileCount: 2, runId })}\n\n`,
    `event: file_start\ndata: ${JSON.stringify({ type: 'file_start', path: '/src/schema/user.ts', language: 'typescript', runId })}\n\n`,
    `event: token\ndata: ${JSON.stringify({ type: 'token', token: 'export ', runId })}\n\n`,
    `event: file_complete\ndata: ${JSON.stringify({ type: 'file_complete', path: '/src/schema/user.ts', size: 120, runId })}\n\n`,
    `event: batch_complete\ndata: ${JSON.stringify({ type: 'batch_complete', batchNumber: 1, filesGenerated: 1, runId })}\n\n`,
    `event: done\ndata: ${JSON.stringify({ runId, tokensUsed: 100, durationMs: 50, output: { filesGenerated: 1, agentType: 'schema_gen' } })}\n\n`,
  ]
  return lines.join('')
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
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(phase4Project) }),
  )
  await page.route('**/projects/proj-1/files', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockFiles) }),
  )
  await page.route('**/projects/proj-1/generation-plan', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(generationPlan) }),
  )
  await page.route('**/projects/proj-1/advance-phase', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { previousPhase: 4, currentPhase: 5 } }),
    }),
  )
  await page.route('**/ai/chat', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { content: 'ok', tokensUsed: 1 } }),
    }),
  )
})

test('Phase 4 build page shows explorer and generation plan', async ({ page }) => {
  await page.goto('/project/proj-1/build')
  await expect(page.getByText('Explorer', { exact: true })).toBeVisible()
  await expect(page.getByTestId('generation-plan-summary')).toContainText('32 files across 6 batches')
  await expect(page.getByText('user.ts').first()).toBeVisible()
})

test('Generate Schema triggers stream and batch bar', async ({ page }) => {
  await page.route('**/ai/runs', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    const raw = route.request().postData()
    const body = raw ? (JSON.parse(raw) as { agentType?: string }) : {}
    const runId = body.agentType === 'schema_gen' ? 'run-schema-1' : 'run-test-1'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { runId, streamUrl: `/ai/runs/${runId}/stream`, status: 'running' } }),
    })
  })
  await page.route('**/ai/runs/run-schema-1/stream', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      body: sseBody(),
    })
  })

  await page.goto('/project/proj-1/build')
  await page.getByTestId('agent-btn-schema_gen').click()
  await expect(page.getByTestId('batch-progress-bar')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/Writing \/src\/schema\/user.ts/)).toBeVisible({ timeout: 15_000 })
})

test('API button disabled styling before schema in copilot', async ({ page }) => {
  await page.goto('/project/proj-1/build')
  const api = page.getByTestId('agent-btn-api_gen')
  await expect(api).toHaveClass(/opacity-40/)
})

test('Next Phase disabled until agents complete', async ({ page }) => {
  await page.goto('/project/proj-1/build')
  const next = page.getByRole('button', { name: /Next Phase/ }).last()
  await expect(next).toBeDisabled()
})
