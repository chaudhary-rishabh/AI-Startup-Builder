import { defineConfig } from 'drizzle-kit'

const databaseUrl =
  process.env['DATABASE_URL'] ?? 'postgresql://postgres:devpassword@localhost:5432/aistartup'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  tablesFilter: ['rag_namespaces'],
  verbose: true,
  strict: true,
})
