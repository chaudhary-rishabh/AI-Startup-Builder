import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgSchema,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

const timestampColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}

export const aiSchema = pgSchema('ai')

export const runStatusEnum = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const

export const agentRuns = aiSchema.table(
  'agent_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull(),
    userId: uuid('user_id').notNull(),
    phase: smallint('phase').notNull(),
    agentType: varchar('agent_type', { length: 64 }).notNull(),
    model: varchar('model', { length: 64 }).notNull(),
    status: varchar('status', { enum: runStatusEnum }).notNull().default('pending'),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    totalTokens: integer('total_tokens'),
    costUsd: varchar('cost_usd', { length: 20 }),
    durationMs: integer('duration_ms'),
    errorMessage: text('error_message'),
    /** PROVIDER_RATE_LIMIT | BUDGET_EXCEEDED | CONTEXT_TOO_LARGE | TIMEOUT | INTERNAL_ERROR */
    errorCode: varchar('error_code', { length: 100 }),
    ragContextUsed: boolean('rag_context_used').notNull().default(false),
    ragChunksInjected: integer('rag_chunks_injected').notNull().default(0),
    contextTokensEstimate: integer('context_tokens_estimate'),
    wasContextCompressed: boolean('was_context_compressed').notNull().default(false),
    /** direct | compressed | contextual_rag | none */
    docInjectionMode: varchar('doc_injection_mode', { length: 20 }),
    /** Points to original run_id when this run is a retry */
    retryOfRunId: uuid('retry_of_run_id'),
    /** Phase 4 multi-batch tracking — which batch within a generation run */
    batchNumber: integer('batch_number'),
    batchTotal: integer('batch_total'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userCreatedIdx: index('agent_runs_user_created_idx').on(t.userId, t.createdAt),
    projectPhaseIdx: index('agent_runs_project_phase_idx').on(t.projectId, t.phase),
    statusCreatedIdx: index('agent_runs_status_created_idx').on(t.status, t.createdAt),
    agentModelCreatedIdx: index('agent_runs_agent_model_created_idx').on(
      t.agentType,
      t.model,
      t.createdAt,
    ),
    retryOfRunFk: foreignKey({
      columns: [t.retryOfRunId],
      foreignColumns: [t.id],
      name: 'agent_runs_retry_of_run_id_agent_runs_id_fk',
    }),
  }),
)

export const agentOutputs = aiSchema.table(
  'agent_outputs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
      .notNull()
      .references(() => agentRuns.id, { onDelete: 'cascade' }),
    outputData: jsonb('output_data').notNull(),
    rawText: text('raw_text').notNull(),
    parseSuccess: boolean('parse_success').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    runIdUnique: uniqueIndex('agent_outputs_run_id_idx').on(t.runId),
  }),
)

export const ragDocStatusEnum = ['pending', 'indexing', 'indexed', 'failed'] as const

export const ragDocuments = aiSchema.table(
  'rag_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    /** Legacy display name; prefer `filename` for uploads */
    name: varchar('name', { length: 255 }).notNull(),
    filename: varchar('filename', { length: 255 }),
    sourceType: varchar('source_type', { length: 50 }).notNull(),
    fileType: varchar('file_type', { length: 50 }),
    fileSizeBytes: integer('file_size_bytes'),
    sourceUrl: text('source_url'),
    s3Key: text('s3_key'),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    chunkCount: integer('chunk_count'),
    status: varchar('status', { enum: ragDocStatusEnum }).notNull().default('pending'),
    pineconeNamespace: varchar('pinecone_namespace', { length: 255 }).notNull(),
    customInstructions: text('custom_instructions'),
    indexedAt: timestamp('indexed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userStatusIdx: index('idx_rag_user_status').on(t.userId, t.status),
  }),
)

export const promptTemplates = aiSchema.table(
  'prompt_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phase: smallint('phase').notNull(),
    agentType: varchar('agent_type', { length: 64 }).notNull(),
    template: text('template').notNull(),
    version: integer('version').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    notes: text('notes'),
    ...timestampColumns,
  },
  (t) => ({
    agentActiveIdx: index('prompt_templates_agent_active_idx').on(t.agentType, t.isActive),
  }),
)

export const generationPlans = aiSchema.table(
  'generation_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull(),
    planData: jsonb('plan_data').notNull(),
    tier: varchar('tier', { length: 32 }).notNull(),
    totalFiles: integer('total_files').notNull(),
    totalBatches: integer('total_batches').notNull(),
    architecture: varchar('architecture', { length: 64 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    completedBatches: integer('completed_batches').notNull().default(0),
    ...timestampColumns,
  },
  (t) => ({
    projectIdx: index('generation_plans_project_idx').on(t.projectId),
  }),
)

export type AgentRun = typeof agentRuns.$inferSelect
export type NewAgentRun = typeof agentRuns.$inferInsert
export type AgentOutput = typeof agentOutputs.$inferSelect
export type NewAgentOutput = typeof agentOutputs.$inferInsert
export type PromptTemplate = typeof promptTemplates.$inferSelect
export type NewPromptTemplate = typeof promptTemplates.$inferInsert
export type GenerationPlan = typeof generationPlans.$inferSelect
export type NewGenerationPlan = typeof generationPlans.$inferInsert
export type RagDocument = typeof ragDocuments.$inferSelect
export type NewRagDocument = typeof ragDocuments.$inferInsert
