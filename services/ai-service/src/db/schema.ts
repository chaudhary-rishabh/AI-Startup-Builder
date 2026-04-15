import {
  boolean,
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
    errorCode: varchar('error_code', { length: 64 }),
    ragContextUsed: boolean('rag_context_used').notNull().default(false),
    ragChunksInjected: integer('rag_chunks_injected').notNull().default(0),
    contextTokensEstimate: integer('context_tokens_estimate'),
    wasContextCompressed: boolean('was_context_compressed').notNull().default(false),
    docInjectionMode: varchar('doc_injection_mode', { length: 32 }),
    retryOfRunId: uuid('retry_of_run_id'),
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
