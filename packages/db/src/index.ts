// Drizzle client factory — one instance per service
export { createDrizzleClient } from './client.js'
export type { DrizzleClient } from './client.js'

// Pagination helpers
export { paginate, buildPaginationMeta } from './helpers/paginate.js'
export type { PaginateResult } from './helpers/paginate.js'

// Soft-delete helpers
export { withActive, deletedAtNow } from './helpers/softDelete.js'

// Shared column definitions for Drizzle schema tables
export { timestampColumns, softDeleteColumn } from './helpers/timestamps.js'
