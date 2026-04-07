import type { PaginationMeta } from '@repo/types'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface PaginateResult<T> {
  data: T[]
  meta: PaginationMeta
}

/**
 * Builds a PaginationMeta object from total, page, and limit values.
 * Clamps limit to MAX_LIMIT. Calculates totalPages and cursor hints.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const clampedLimit = Math.min(Math.max(1, limit), MAX_LIMIT)
  const totalPages = Math.ceil(total / clampedLimit)

  return {
    total,
    page,
    limit: clampedLimit,
    totalPages,
  }
}

/**
 * Generic paginator for Drizzle queries.
 *
 * Usage:
 * ```ts
 * const result = await paginate({
 *   dataFn: (limit, offset) =>
 *     db.select().from(projects).where(eq(projects.userId, userId)).limit(limit).offset(offset),
 *   countFn: () =>
 *     db.select({ count: count() }).from(projects).where(eq(projects.userId, userId))
 *       .then(([row]) => row?.count ?? 0),
 *   page: 1,
 *   limit: 20,
 * })
 * ```
 */
export async function paginate<T>(options: {
  dataFn: (limit: number, offset: number) => Promise<T[]>
  countFn: () => Promise<number>
  page?: number
  limit?: number
}): Promise<PaginateResult<T>> {
  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
  const offset = (page - 1) * limit

  const [data, total] = await Promise.all([
    options.dataFn(limit, offset),
    options.countFn(),
  ])

  return {
    data,
    meta: buildPaginationMeta(total, page, limit),
  }
}
