import * as refreshQueries from '../db/queries/refreshTokens.queries.js'

export function startCleanupJob(): NodeJS.Timeout {
  const run = (): void => {
    void (async () => {
      try {
        const deleted = await refreshQueries.deleteExpiredTokens()
        console.log(
          JSON.stringify({
            job: 'cleanup_expired_tokens',
            deleted,
            at: new Date().toISOString(),
          }),
        )
      } catch (e) {
        console.error('[auth-service] cleanup_expired_tokens job failed:', e)
      }
    })()
  }

  run()
  const handle = setInterval(run, 6 * 60 * 60 * 1000)
  return handle
}

export function stopCleanupJob(handle: NodeJS.Timeout): void {
  clearInterval(handle)
}
