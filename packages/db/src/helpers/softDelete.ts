import { isNull, sql } from 'drizzle-orm'
import type { AnyColumn, SQL } from 'drizzle-orm'

/**
 * Returns a Drizzle WHERE condition that excludes soft-deleted rows.
 *
 * Usage:
 * ```ts
 * db.select().from(users).where(withActive(users.deletedAt))
 * ```
 */
export function withActive(deletedAtColumn: AnyColumn): SQL {
  return isNull(deletedAtColumn)
}

/**
 * SQL expression that resolves to the current timestamp.
 * Used in UPDATE SET clauses to soft-delete a record:
 *
 * ```ts
 * await db.update(users)
 *   .set({ deletedAt: deletedAtNow() })
 *   .where(eq(users.id, id))
 * ```
 */
export function deletedAtNow(): SQL<Date> {
  return sql<Date>`NOW()`
}
