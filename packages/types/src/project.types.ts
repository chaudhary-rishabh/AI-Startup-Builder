export type PhaseNumber = 1 | 2 | 3 | 4 | 5 | 6
export type ProjectStatus = 'active' | 'archived' | 'launched' | 'deleted'
export type ProjectMode = 'design' | 'dev'
export type ExportFormat = 'zip' | 'docx' | 'pdf'

export interface Project {
  id: string
  userId: string
  name: string
  description: string | null
  emoji: string
  currentPhase: PhaseNumber
  status: ProjectStatus
  isStarred: boolean
  mode: ProjectMode
  phaseProgress: Record<string, 'complete' | 'active' | 'locked'>
  contextSummary: string | null
  lastActiveAt: string
  launchedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface PhaseOutput {
  id: string
  projectId: string
  phase: PhaseNumber
  outputData: Record<string, unknown>
  version: number
  isCurrent: boolean
  createdAt: string
}

export interface ProjectFile {
  id: string
  projectId: string
  path: string
  content: string
  language: string | null
  agentType: string | null
  isModified: boolean
  createdAt: string
  updatedAt: string
}

export interface DesignCanvas {
  id: string
  projectId: string
  canvasData: CanvasElement[]
  pages: CanvasPage[]
  designTokens: Record<string, unknown>
  viewport: { x: number; y: number; zoom: number }
  updatedAt: string
}

export interface CanvasElement {
  id: string
  type: 'rect' | 'text' | 'frame' | 'group' | 'component'
  x: number
  y: number
  width: number
  height: number
  props: Record<string, unknown>
  children: CanvasElement[]
}

export interface CanvasPage {
  id: string
  name: string
  artboardId: string
}

export interface ConversationMessage {
  id: string
  projectId: string
  phase: PhaseNumber
  role: 'user' | 'assistant' | 'system'
  content: string
  agentRunId: string | null
  metadata: {
    tokenCount?: number
    model?: string
    streamDone?: boolean
  }
  createdAt: string
}

export interface ProjectExport {
  id: string
  projectId: string
  format: ExportFormat
  s3Key: string
  expiresAt: string
  createdAt: string
}
