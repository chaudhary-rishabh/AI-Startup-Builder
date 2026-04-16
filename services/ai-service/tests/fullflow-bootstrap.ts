/**
 * Runs before env-setup so DATABASE_URL / REDIS_URL from testcontainers are visible
 * to config/env.ts when the worker loads the app.
 */
import fs from 'node:fs'
import path from 'node:path'

const envPath = path.join(process.cwd(), '.vitest-fullflow-env.json')
if (fs.existsSync(envPath)) {
  try {
    const raw = fs.readFileSync(envPath, 'utf8')
    const data = JSON.parse(raw) as Record<string, unknown>
    for (const [k, v] of Object.entries(data)) {
      if (k === 'SKIP_FULL_FLOW' && (v === '1' || v === 1 || v === true)) {
        process.env['SKIP_FULL_FLOW'] = '1'
        continue
      }
      if (typeof v === 'string' && v.length > 0) {
        process.env[k] = v
      }
    }
  } catch {
    /* ignore */
  }
}
