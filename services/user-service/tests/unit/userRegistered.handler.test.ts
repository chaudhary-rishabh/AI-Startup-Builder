import { beforeEach, describe, expect, it, vi } from 'vitest'

const findProfileById = vi.fn()
const createProfile = vi.fn()
const createOnboardingState = vi.fn()

vi.mock('../../src/db/queries/profiles.queries.js', () => ({
  findProfileById: (...a: unknown[]) => findProfileById(...a),
  createProfile: (...a: unknown[]) => createProfile(...a),
}))

vi.mock('../../src/db/queries/onboarding.queries.js', () => ({
  createOnboardingState: (...a: unknown[]) => createOnboardingState(...a),
}))

const loggerFns = vi.hoisted(() => ({
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))
vi.mock('../../src/lib/logger.js', () => ({
  logger: loggerFns,
}))

const { handleUserRegistered } = await import('../../src/events/handlers/userRegistered.handler.js')

describe('userRegistered.handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createProfile.mockResolvedValue({ id: 'u1' })
    createOnboardingState.mockResolvedValue({ userId: 'u1' })
  })

  it('creates profile and onboarding state for new user', async () => {
    findProfileById.mockResolvedValue(undefined)
    const payload = {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      email: 'a@b.com',
      name: 'N',
      plan: 'free',
    }
    await handleUserRegistered(payload)
    expect(createProfile).toHaveBeenCalled()
    expect(createOnboardingState).toHaveBeenCalledWith(payload.userId)
  })

  it('silently returns if profile already exists (idempotent)', async () => {
    findProfileById.mockResolvedValue({ id: 'u1' } as never)
    await handleUserRegistered({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      email: 'a@b.com',
      name: 'N',
      plan: 'free',
    })
    expect(createProfile).not.toHaveBeenCalled()
  })

  it('logs warning and returns on invalid payload (no crash)', async () => {
    loggerFns.warn.mockClear()
    await handleUserRegistered({ userId: 'not-uuid' })
    expect(createProfile).not.toHaveBeenCalled()
    expect(loggerFns.warn).toHaveBeenCalled()
  })

  it('does not throw when DB insert fails (logs error, returns)', async () => {
    loggerFns.error.mockClear()
    findProfileById.mockResolvedValue(undefined)
    createProfile.mockRejectedValue(new Error('db fail'))
    await expect(
      handleUserRegistered({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'a@b.com',
        name: 'N',
        plan: 'free',
      }),
    ).resolves.toBeUndefined()
    expect(loggerFns.error).toHaveBeenCalled()
  })
})
