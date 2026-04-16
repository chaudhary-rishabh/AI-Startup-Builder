import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import pg from 'pg'

const envPath = path.join(process.cwd(), '.vitest-fullflow-env.json')

export default async function globalSetup(): Promise<() => Promise<void>> {
  // Ryuk sidecar often breaks on Docker Desktop for Windows; containers still stop with Vitest teardown.
  process.env['TESTCONTAINERS_RYUK_DISABLED'] = 'true'

  if (process.env['SKIP_TESTCONTAINERS'] === '1') {
    fs.writeFileSync(envPath, JSON.stringify({ SKIP_FULL_FLOW: '1' }, null, 2), 'utf8')
    return async () => {
      try {
        fs.unlinkSync(envPath)
      } catch {
        /* ignore */
      }
    }
  }

  try {
    const { PostgreSqlContainer } = await import('@testcontainers/postgresql')
    const { GenericContainer, Wait } = await import('testcontainers')

    const pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start()
    const redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start()

    const databaseUrl = pgContainer.getConnectionUri()
    const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`

    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const migrationsDir = path.join(__dirname, '../src/db/migrations')
    const migrationFiles = ['0000_bouncy_network.sql', '0001_jittery_gateway.sql']
    const client = new pg.Client({ connectionString: databaseUrl })
    await client.connect()
    for (const file of migrationFiles) {
      const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      for (const chunk of migrationSql.split('--> statement-breakpoint')) {
        const stmt = chunk.trim()
        if (stmt.length > 0) await client.query(stmt)
      }
    }
    await client.end()

    fs.writeFileSync(
      envPath,
      JSON.stringify(
        {
          DATABASE_URL: databaseUrl,
          REDIS_URL: redisUrl,
          VITEST_USE_TESTCONTAINERS: '1',
        },
        null,
        2,
      ),
      'utf8',
    )

    return async () => {
      await pgContainer.stop()
      await redisContainer.stop()
      try {
        fs.unlinkSync(envPath)
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    console.warn('[fullflow globalSetup] testcontainers failed; full flow tests will be skipped', err)
    fs.writeFileSync(envPath, JSON.stringify({ SKIP_FULL_FLOW: '1' }, null, 2), 'utf8')
    return async () => {
      try {
        fs.unlinkSync(envPath)
      } catch {
        /* ignore */
      }
    }
  }
}
