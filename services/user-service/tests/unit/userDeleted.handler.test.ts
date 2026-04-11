import { beforeEach, describe, expect, it, vi } from 'vitest'

const deleteAllIntegrationsForUser = vi.fn()
const deleteProfile = vi.fn()

vi.mock('../../src/db/queries/integrations.queries.js', () => ({
  deleteAllIntegrationsForUser: (...a: unknown[]) => deleteAllIntegrationsForUser(...a),
}))

vi.mock('../../src/db/queries/profiles.queries.js', () => ({
  deleteProfile: (...a: unknown[]) => deleteProfile(...a),
}))

const loggerFns = vi.hoisted(() => ({
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))
vi.mock('../../src/lib/logger.js', () => ({
  logger: loggerFns,
}))

const { handleUserDeleted } = await import('../../src/events/handlers/userDeleted.handler.js')

const validUid = '550e8400-e29b-41d4-a716-446655440000'

describe('userDeleted.handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deleteAllIntegrationsForUser.mockResolvedValue(undefined)
    deleteProfile.mockResolvedValue(undefined)
  })

  it('deletes integrations and profile for valid userId', async () => {
    await handleUserDeleted({ userId: validUid })
    expect(deleteAllIntegrationsForUser).toHaveBeenCalledWith(validUid)
    expect(deleteProfile).toHaveBeenCalledWith(validUid)
    expect(loggerFns.info).toHaveBeenCalled()
  })

  it('invalid payload logs warning, does not throw', async () => {
    await expect(handleUserDeleted({ userId: 'bad' })).resolves.toBeUndefined()
    expect(deleteAllIntegrationsForUser).not.toHaveBeenCalled()
    expect(loggerFns.warn).toHaveBeenCalled()
  })

  it('idempotent: second call with same userId does not throw', async () => {
    await handleUserDeleted({ userId: validUid })
    await handleUserDeleted({ userId: validUid })
    expect(deleteAllIntegrationsForUser).toHaveBeenCalledTimes(2)
    expect(deleteProfile).toHaveBeenCalledTimes(2)
  })
})
