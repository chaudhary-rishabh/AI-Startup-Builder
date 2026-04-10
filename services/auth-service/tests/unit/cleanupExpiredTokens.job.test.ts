import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const deleteExpiredTokens = vi.fn()

vi.mock('../../src/db/queries/refreshTokens.queries.js', () => ({
  deleteExpiredTokens: (...args: unknown[]) => deleteExpiredTokens(...args),
}))

const job = await import('../../src/jobs/cleanupExpiredTokens.job.js')

describe('cleanupExpiredTokens.job', () => {
  beforeEach(() => {
    deleteExpiredTokens.mockResolvedValue(3)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('startCleanupJob calls deleteExpiredTokens', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const handle = job.startCleanupJob()
    await vi.waitFor(() => expect(deleteExpiredTokens).toHaveBeenCalled())
    expect(log).toHaveBeenCalled()
    const payload = log.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('cleanup_expired_tokens'),
    )
    expect(payload).toBeDefined()
    job.stopCleanupJob(handle)
    log.mockRestore()
  })

  it('errors in deleteExpiredTokens are caught and logged', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    deleteExpiredTokens.mockRejectedValueOnce(new Error('fail'))
    const handle = job.startCleanupJob()
    await vi.waitFor(() => expect(err).toHaveBeenCalled())
    job.stopCleanupJob(handle)
    log.mockRestore()
    err.mockRestore()
  })

  it('stopCleanupJob clears the interval', () => {
    const handle = job.startCleanupJob()
    const clear = vi.spyOn(global, 'clearInterval')
    job.stopCleanupJob(handle)
    expect(clear).toHaveBeenCalledWith(handle)
  })
})
