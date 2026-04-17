import api from '@/lib/axios'

export interface StartRunPayload {
  projectId: string
  agentType: string
  phase: number
  userMessage?: string
}

export interface AgentRunResponse {
  runId: string
  streamUrl: string
  status: 'running'
}

export interface AgentRun {
  runId: string
  projectId: string
  phase: number
  agentType: string
  model: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  tokensUsed: number
  durationMs: number | null
  output: Record<string, unknown> | null
  createdAt: string
}

export async function startAgentRun(payload: StartRunPayload): Promise<AgentRunResponse> {
  const res = await api.post<{ data: AgentRunResponse }>('/ai/runs', payload)
  return res.data.data
}

export async function getAgentRun(runId: string): Promise<AgentRun> {
  const res = await api.get<{ data: AgentRun }>(`/ai/runs/${runId}`)
  return res.data.data
}

export async function getAgentRunHistory(params: {
  projectId: string
  phase?: number
  limit?: number
}): Promise<AgentRun[]> {
  const res = await api.get<{ data: AgentRun[] }>('/ai/runs', { params })
  return res.data.data
}

export async function cancelAgentRun(runId: string): Promise<void> {
  await api.post(`/ai/runs/${runId}/cancel`)
}

export async function submitCopilotPreferences(
  projectId: string,
  preferences: {
    scale?: string
    platform?: string
    primaryColor?: string
    architecture?: string
    brandFeel?: string
  },
): Promise<void> {
  await api.post(`/projects/${projectId}/copilot-preferences`, preferences)
}
