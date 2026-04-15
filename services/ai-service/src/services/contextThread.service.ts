import { env } from '../config/env.js'

import type { ProjectContext } from '@repo/types'

function baseUrl(): string {
  return env.PROJECT_SERVICE_URL.replace(/\/$/, '')
}

export async function fetchProjectContext(
  projectId: string,
  userId: string,
  _requestId?: string,
): Promise<ProjectContext> {
  const url = `${baseUrl()}/internal/projects/${encodeURIComponent(projectId)}/context?userId=${encodeURIComponent(userId)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) {
    const err = new Error(`Project context fetch failed: ${res.status}`) as Error & {
      status: number
    }
    err.status = res.status === 404 ? 404 : res.status
    throw err
  }
  const json = (await res.json()) as { success: boolean; data: ProjectContext }
  return json.data
}

export async function saveAgentOutputToProject(
  projectId: string,
  phase: number,
  outputData: Record<string, unknown>,
  agentType: string,
  _requestId?: string,
): Promise<void> {
  try {
    const url = `${baseUrl()}/internal/projects/${encodeURIComponent(projectId)}/phases/${phase}/output`
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputData, agentType }),
    })
  } catch (e) {
    console.error('[ai-service] saveAgentOutputToProject failed', e)
  }
}

export async function fetchConversationHistory(
  projectId: string,
  phase: number,
  authorization?: string,
  _requestId?: string,
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  try {
    const url = `${baseUrl()}/projects/${encodeURIComponent(projectId)}/conversations?phase=${phase}`
    const headers: Record<string, string> = {}
    if (authorization) headers.Authorization = authorization
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return []
    const json = (await res.json()) as {
      success: boolean
      data: { messages: Array<{ role: string; content: string }> }
    }
    const msgs = json.data?.messages ?? []
    return msgs
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      .slice(-10)
  } catch {
    return []
  }
}

export async function saveDesignTokensToCanvas(
  projectId: string,
  designSystem: Record<string, unknown>,
  _requestId?: string,
): Promise<void> {
  try {
    const b = baseUrl()
    const getRes = await fetch(`${b}/internal/projects/${encodeURIComponent(projectId)}/canvas`)
    let canvasData: unknown[] = []
    if (getRes.ok) {
      const j = (await getRes.json()) as { data?: { canvasData?: unknown[] } }
      canvasData = j.data?.canvasData ?? []
    }
    await fetch(`${b}/internal/projects/${encodeURIComponent(projectId)}/canvas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvasData, designTokens: designSystem }),
    })
  } catch (e) {
    console.error('[ai-service] saveDesignTokensToCanvas failed', e)
  }
}

export async function appendFrameToCanvas(
  projectId: string,
  frame: Record<string, unknown>,
  pageName: string,
  _requestId?: string,
): Promise<void> {
  try {
    await fetch(
      `${baseUrl()}/internal/projects/${encodeURIComponent(projectId)}/canvas/append-frame`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame, pageName }),
      },
    )
  } catch (e) {
    console.error('[ai-service] appendFrameToCanvas failed', e)
  }
}

export async function saveProjectPrototypeFile(
  projectId: string,
  filePath: string,
  content: string,
  language: string,
  agentType: string,
  _requestId?: string,
): Promise<void> {
  try {
    await fetch(`${baseUrl()}/internal/projects/${encodeURIComponent(projectId)}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content, language, agentType }),
    })
  } catch (e) {
    console.error('[ai-service] saveProjectPrototypeFile failed', e)
  }
}
