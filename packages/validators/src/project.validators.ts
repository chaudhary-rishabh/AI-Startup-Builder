import { z } from 'zod'

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name required').max(200),
  emoji: z.string().max(10).default('🚀'),
  description: z.string().max(500).optional(),
})

export const UpdateProjectSchema = CreateProjectSchema.partial()

// Phase transitions are sequential (1→2→3…→6).
// Schema accepts 2-6; the service validates that targetPhase === currentPhase + 1.
export const AdvancePhaseSchema = z.object({
  targetPhase: z.number().int().min(2).max(6),
})

export const SavePhaseDataSchema = z.object({
  data: z.record(z.unknown()),
  isComplete: z.boolean().optional(),
})

export const InternalPhaseOutputSchema = z.object({
  outputData: z.record(z.unknown()),
  agentType: z.string().min(1),
})

export const ExportProjectSchema = z.object({
  format: z.enum(['zip', 'docx', 'pdf']),
  includePhases: z.array(z.number().int().min(1).max(6)).optional(),
})

export const AppendConversationSchema = z.object({
  content: z.string().min(1).max(10_000),
  phase: z.number().int().min(1).max(6),
})

export const ListProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'archived', 'all']).optional(),
  isStarred: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((v) => (typeof v === 'string' ? v === 'true' : v)),
  phase: z.coerce.number().int().min(1).max(6).optional(),
  sort: z.enum(['lastActiveAt', 'createdAt', 'name']).default('lastActiveAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export const AdminProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  status: z.string().optional(),
  phase: z.coerce.number().int().min(1).max(6).optional(),
})

export const ProjectSearchQuerySchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters'),
})

export const ConversationListQuerySchema = z.object({
  phase: z.coerce.number().int().min(1).max(6),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const DuplicateProjectBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>
export type AdvancePhaseInput = z.infer<typeof AdvancePhaseSchema>
export type ExportProjectInput = z.infer<typeof ExportProjectSchema>
