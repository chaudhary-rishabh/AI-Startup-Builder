import { index, integer, pgSchema, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

export const aiSchema = pgSchema('ai')

export const ragDocStatusEnum = ['pending', 'processing', 'indexed', 'failed'] as const

/**
 * Mirrors `ai.rag_documents` (managed by shared DB migrations / ai-service).
 * `name` is retained for compatibility with existing rows; new writes set `name` === `filename`.
 */
export const ragDocuments = aiSchema.table(
  'rag_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    filename: varchar('filename', { length: 255 }),
    fileType: varchar('file_type', { length: 50 }).notNull(),
    fileSizeBytes: integer('file_size_bytes'),
    sourceType: varchar('source_type', { length: 50 }).notNull(),
    sourceUrl: text('source_url'),
    s3Key: text('s3_key'),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    chunkCount: integer('chunk_count'),
    status: varchar('status', { enum: ragDocStatusEnum }).notNull().default('pending'),
    pineconeNamespace: varchar('pinecone_namespace', { length: 255 }).notNull(),
    customInstructions: text('custom_instructions'),
    errorMessage: text('error_message'),
    indexedAt: timestamp('indexed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userStatusIdx: index('idx_rag_user_status').on(t.userId, t.status),
    userHashIdx: index('idx_rag_user_content_hash').on(t.userId, t.contentHash),
    userCreatedIdx: index('idx_rag_user_created').on(t.userId, t.createdAt),
  }),
)

export const ragNamespaces = aiSchema.table(
  'rag_namespaces',
  {
    userId: uuid('user_id').primaryKey().notNull(),
    pineconeNamespace: varchar('pinecone_namespace', { length: 255 }).notNull(),
    docCount: integer('doc_count').notNull().default(0),
    totalChunks: integer('total_chunks').notNull().default(0),
    lastIndexedAt: timestamp('last_indexed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    nsIdx: uniqueIndex('rag_namespaces_pinecone_idx').on(t.pineconeNamespace),
  }),
)

export type RagDocument = typeof ragDocuments.$inferSelect
export type NewRagDocument = typeof ragDocuments.$inferInsert
export type RagNamespace = typeof ragNamespaces.$inferSelect
export type NewRagNamespace = typeof ragNamespaces.$inferInsert
