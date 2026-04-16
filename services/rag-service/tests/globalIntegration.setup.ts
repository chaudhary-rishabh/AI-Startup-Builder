import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.vitest-rag-integration.json')

export default async function globalSetup(): Promise<() => Promise<void>> {
  if (process.env['SKIP_RAG_TESTCONTAINERS'] === '1') {
    fs.writeFileSync(envPath, JSON.stringify({ SKIP_RAG_INTEGRATION: '1' }, null, 2), 'utf8')
    return async () => {
      try {
        fs.unlinkSync(envPath)
      } catch {
        /* ignore */
      }
    }
  }

  try {
    process.env['TESTCONTAINERS_RYUK_DISABLED'] = 'true'
    const { PostgreSqlContainer } = await import('@testcontainers/postgresql')
    const { GenericContainer, Wait } = await import('testcontainers')

    const pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start()
    const redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start()

    const databaseUrl = pgContainer.getConnectionUri()
    const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`

    const migrationSql = fs.readFileSync(
      path.join(__dirname, '../src/db/migrations/0000_dry_misty_knight.sql'),
      'utf8',
    )
    const client = new pg.Client({ connectionString: databaseUrl })
    await client.connect()
    for (const chunk of migrationSql.split('--> statement-breakpoint')) {
      const stmt = chunk.trim()
      if (stmt.length > 0) await client.query(stmt)
    }
    await client.end()

    fs.writeFileSync(
      envPath,
      JSON.stringify(
        {
          DATABASE_URL: databaseUrl,
          REDIS_URL: redisUrl,
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
    console.warn('[rag-service globalSetup] testcontainers failed; integration tests skipped', err)
    fs.writeFileSync(envPath, JSON.stringify({ SKIP_RAG_INTEGRATION: '1' }, null, 2), 'utf8')
    return async () => {
      try {
        fs.unlinkSync(envPath)
      } catch {
        /* ignore */
      }
    }
  }
}
