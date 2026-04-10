import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/db.js', () => ({
  getDb: vi.fn(),
}))

import * as dbMod from '../../src/lib/db.js'
import * as onboardingQueries from '../../src/db/queries/onboarding.queries.js'

describe('onboarding.queries', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dbMod.getDb).mockReturnValue(mockDb as never)
  })

  it('findOnboardingByUserId returns state when found', async () => {
    const row = { userId: 'u1', currentStep: 'profile' } as never
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(onboardingQueries.findOnboardingByUserId('u1')).resolves.toBe(row)
  })

  it('createOnboardingState creates with default values', async () => {
    const row = {
      userId: 'u1',
      currentStep: 'profile',
      completedSteps: [],
      stepData: {},
    } as never
    mockDb.insert.mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([row]),
      }),
    } as never)

    const created = await onboardingQueries.createOnboardingState('u1')
    expect(created.userId).toBe('u1')
    expect(created.currentStep).toBe('profile')
  })

  it('updateOnboardingState updates specified fields', async () => {
    const row = { userId: 'u1', currentStep: 'idea' } as never
    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(
      onboardingQueries.updateOnboardingState('u1', { currentStep: 'idea' }),
    ).resolves.toEqual(row)
  })

  it('markOnboardingComplete sets completedAt', async () => {
    const row = { userId: 'u1', currentStep: 'complete', completedAt: new Date() } as never
    mockDb.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([row]),
        }),
      }),
    } as never)

    await expect(onboardingQueries.markOnboardingComplete('u1')).resolves.toEqual(row)
  })
})
