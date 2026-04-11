import { defineConfig } from 'drizzle-kit'

/** Drizzle CLI only needs a database URL; avoid loading full app env (secrets not required for generate). */
const databaseUrl =
  process.env['DATABASE_URL'] ?? 'postgresql://postgres:devpassword@localhost:5432/aistartup'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  tablesFilter: ['users_*'],
  verbose: true,
  strict: true,
})
