import { timestamp } from 'drizzle-orm/pg-core'

/**
 * Standard created_at / updated_at columns.
 * Spread into every service schema table definition:
 *
 * ```ts
 * export const users = pgTable('users', {
 *   id: uuid('id').primaryKey().defaultRandom(),
 *   email: varchar('email', { length: 255 }).notNull(),
 *   ...timestampColumns,
 *   ...softDeleteColumn,
 * })
 * ```
 *
 * NOTE: updated_at requires a `moddatetime` trigger in PostgreSQL
 * to auto-update on every row modification. The trigger is added in
 * each service's migration using: CREATE TRIGGER set_updated_at
 * BEFORE UPDATE ON <table> FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);
 */
export const timestampColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}

/**
 * Soft-delete column. NULL means the row is active; non-NULL means deleted.
 * All queries must filter with `withActive(table.deletedAt)` from softDelete.ts.
 */
export const softDeleteColumn = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}
