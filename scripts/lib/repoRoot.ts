import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Repository root when running via `pnpm` from the monorepo (INIT_CWD),
 * otherwise inferred from this file location (`scripts/lib` → two levels up).
 */
export function getRepoRoot(): string {
  const fromPnpm = process.env['INIT_CWD']
  if (fromPnpm) return fromPnpm

  const here = dirname(fileURLToPath(import.meta.url))
  return join(here, '..', '..')
}
