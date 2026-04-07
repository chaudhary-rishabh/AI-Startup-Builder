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
})

export const ExportProjectSchema = z.object({
  format: z.enum(['zip', 'docx', 'pdf']),
  includePhases: z.array(z.number().int().min(1).max(6)).optional(),
})

export const AppendConversationSchema = z.object({
  content: z.string().min(1).max(10_000),
  phase: z.number().int().min(1).max(6),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>
export type AdvancePhaseInput = z.infer<typeof AdvancePhaseSchema>
export type ExportProjectInput = z.infer<typeof ExportProjectSchema>
