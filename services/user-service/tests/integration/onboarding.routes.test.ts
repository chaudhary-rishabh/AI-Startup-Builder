import { beforeEach, describe, expect, it, vi } from 'vitest'

const onboardingMocks = vi.hoisted(() => ({
  findOnboardingByUserId: vi.fn(),
  createOnboardingState: vi.fn(),
  updateOnboardingState: vi.fn(),
}))

const authMocks = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
  verifyPassword: vi.fn(),
  softDeleteAuthUser: vi.fn(),
  patchAuthUserFullName: vi.fn(),
  completeAuthOnboarding: vi.fn(),
}))

const publisherMocks = vi.hoisted(() => ({
  publishUserProfileUpdated: vi.fn(),
  publishUserApiKeyCreated: vi.fn(),
  publishUserDeleted: vi.fn(),
  publishUserOnboardingCompleted: vi.fn(),
}))

vi.mock('../../src/db/queries/onboarding.queries.js', () => onboardingMocks)
vi.mock('../../src/services/authClient.service.js', () => authMocks)
vi.mock('../../src/events/publisher.js', () => publisherMocks)

const { createApp } = await import('../../src/app.js')
const { signTestAccessToken } = await import('../jwt-test.js')

const uid = '650e8400-e29b-41d4-a716-446655440001'
const now = new Date()

function state(over: Record<string, unknown> = {}) {
  return {
    id: 'os-1',
    userId: uid,
    currentStep: 'profile',
    completedSteps: [],
    stepData: {},
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  }
}

describe('onboarding routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string

  beforeEach(async () => {
    vi.clearAllMocks()
    app = createApp()
    token = await signTestAccessToken({ sub: uid })
    authMocks.completeAuthOnboarding.mockResolvedValue(undefined)
    publisherMocks.publishUserOnboardingCompleted.mockResolvedValue(undefined)
  })

  it('GET /users/me/onboarding without JWT → 401', async () => {
    const res = await app.request('http://localhost/users/me/onboarding')
    expect(res.status).toBe(401)
  })

  it('GET /users/me/onboarding → 200 with currentStep and completedSteps', async () => {
    onboardingMocks.findOnboardingByUserId.mockResolvedValue(
      state({ completedSteps: ['profile'], currentStep: 'idea' }) as never,
    )

    const res = await app.request('http://localhost/users/me/onboarding', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { currentStep: string; completedSteps: string[] } }
    expect(json.data.currentStep).toBe('idea')
    expect(json.data.completedSteps).toEqual(['profile'])
  })

  it('GET /users/me/onboarding when not found → creates and returns default state', async () => {
    onboardingMocks.findOnboardingByUserId.mockResolvedValueOnce(undefined)
    onboardingMocks.createOnboardingState.mockResolvedValue(state() as never)

    const res = await app.request('http://localhost/users/me/onboarding', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    expect(onboardingMocks.createOnboardingState).toHaveBeenCalledWith(uid)
  })

  it("POST complete step 'profile' → 200 next step idea", async () => {
    onboardingMocks.findOnboardingByUserId.mockResolvedValue(state() as never)
    onboardingMocks.updateOnboardingState.mockResolvedValue(
      state({
        completedSteps: ['profile'],
        currentStep: 'idea',
        stepData: { profile: {} },
      }) as never,
    )

    const res = await app.request('http://localhost/users/me/onboarding/complete', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ step: 'profile', data: { x: 1 } }),
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { currentStep: string } }
    expect(json.data.currentStep).toBe('idea')
  })

  it("POST complete step 'plan' → 200 isComplete=true", async () => {
    onboardingMocks.findOnboardingByUserId.mockResolvedValue(
      state({
        currentStep: 'plan',
        completedSteps: ['profile', 'idea'],
      }) as never,
    )
    onboardingMocks.updateOnboardingState.mockResolvedValue(
      state({
        currentStep: 'complete',
        completedSteps: ['profile', 'idea', 'plan'],
        completedAt: now,
      }) as never,
    )

    const res = await app.request('http://localhost/users/me/onboarding/complete', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ step: 'plan' }),
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { isComplete: boolean } }
    expect(json.data.isComplete).toBe(true)
    expect(authMocks.completeAuthOnboarding).toHaveBeenCalled()
  })

  it('POST complete out of order (plan before idea) → 409', async () => {
    onboardingMocks.findOnboardingByUserId.mockResolvedValue(
      state({
        currentStep: 'idea',
        completedSteps: ['profile'],
      }) as never,
    )

    const res = await app.request('http://localhost/users/me/onboarding/complete', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ step: 'plan' }),
    })
    expect(res.status).toBe(409)
  })

  it('POST complete when already complete → 409', async () => {
    onboardingMocks.findOnboardingByUserId.mockResolvedValue(
      state({
        currentStep: 'complete',
        completedSteps: ['profile', 'idea', 'plan'],
      }) as never,
    )

    const res = await app.request('http://localhost/users/me/onboarding/complete', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ step: 'profile' }),
    })
    expect(res.status).toBe(409)
  })
})
