import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Inlined like auth-service / user-service so drizzle-kit can load this file
 * without pulling `@repo/db` through drizzle-kit's CJS loader.
 */
const timestampColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}

const softDeleteColumn = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}

export const projectsSchema = pgSchema('projects')

export const projects = projectsSchema.table(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    emoji: text('emoji').notNull().default('🚀'),
    currentPhase: integer('current_phase').notNull().default(1),
    status: text('status', {
      enum: ['active', 'archived', 'launched', 'deleted'],
    })
      .notNull()
      .default('active'),
    isStarred: boolean('is_starred').notNull().default(false),
    mode: text('mode', {
      enum: ['design', 'dev'],
    })
      .notNull()
      .default('design'),
    phaseProgress: jsonb('phase_progress')
      .notNull()
      .default({} as Record<string, unknown>),
    contextSummary: text('context_summary'),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    launchedAt: timestamp('launched_at', { withTimezone: true }),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (t) => ({
    userActiveIdx: index('projects_user_active_idx').on(t.userId, t.lastActiveAt),
    userStatusIdx: index('projects_user_status_idx').on(t.userId, t.status),
    starredIdx: index('projects_starred_idx').on(t.userId, t.isStarred),
    searchIdx: index('projects_search_idx').on(t.name),
  }),
)

export const phaseOutputs = projectsSchema.table(
  'phase_outputs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    phase: integer('phase').notNull(),
    outputData: jsonb('output_data').notNull(),
    version: integer('version').notNull().default(1),
    isCurrent: boolean('is_current').notNull().default(true),
    isComplete: boolean('is_complete').notNull().default(false),
    ...timestampColumns,
  },
  (t) => ({
    projectPhaseIdx: index('phase_outputs_project_phase_idx').on(t.projectId, t.phase),
    currentIdx: index('phase_outputs_current_idx').on(t.projectId, t.phase, t.isCurrent),
  }),
)

export const projectFiles = projectsSchema.table(
  'project_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    content: text('content').notNull(),
    language: text('language'),
    agentType: text('agent_type'),
    isModified: boolean('is_modified').notNull().default(false),
    ...timestampColumns,
  },
  (t) => ({
    pathIdx: uniqueIndex('project_files_path_idx').on(t.projectId, t.path),
    agentTypeIdx: index('project_files_agent_idx').on(t.projectId, t.agentType),
  }),
)

export const designCanvas = projectsSchema.table(
  'design_canvas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' })
      .unique(),
    canvasData: jsonb('canvas_data').notNull().default([] as unknown[]),
    pages: jsonb('pages').notNull().default([] as unknown[]),
    designTokens: jsonb('design_tokens').notNull().default({} as Record<string, unknown>),
    viewport: jsonb('viewport')
      .notNull()
      .default({ x: 0, y: 0, zoom: 1 } as Record<string, unknown>),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: uniqueIndex('design_canvas_project_idx').on(t.projectId),
  }),
)

export const conversationMessages = projectsSchema.table(
  'conversation_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    phase: integer('phase').notNull(),
    role: text('role', {
      enum: ['user', 'assistant', 'system'],
    }).notNull(),
    content: text('content').notNull(),
    agentRunId: uuid('agent_run_id'),
    metadata: jsonb('metadata').notNull().default({} as Record<string, unknown>),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectPhaseIdx: index('conversations_project_phase_idx').on(
      t.projectId,
      t.phase,
      t.createdAt,
    ),
    agentRunIdx: index('conversations_agent_run_idx').on(t.agentRunId),
  }),
)

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type PhaseOutput = typeof phaseOutputs.$inferSelect
export type NewPhaseOutput = typeof phaseOutputs.$inferInsert
export type ProjectFile = typeof projectFiles.$inferSelect
export type NewProjectFile = typeof projectFiles.$inferInsert
export type DesignCanvas = typeof designCanvas.$inferSelect
export type NewDesignCanvas = typeof designCanvas.$inferInsert
export type ConversationMessage = typeof conversationMessages.$inferSelect
export type NewConversationMessage = typeof conversationMessages.$inferInsert
