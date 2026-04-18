import api from '@/lib/axios'
import type { GenerationPlan, ProjectFile } from '@/types'

export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const res = await api.get<{ data: ProjectFile[] }>(`/projects/${projectId}/files`)
  const files = res.data.data
  return [...files].sort((a, b) => a.path.localeCompare(b.path))
}

export async function getFileContent(projectId: string, fileId: string): Promise<ProjectFile> {
  const res = await api.get<{ data: ProjectFile }>(`/projects/${projectId}/files/${fileId}`)
  return res.data.data
}

export async function updateFileContent(projectId: string, fileId: string, content: string): Promise<ProjectFile> {
  const res = await api.patch<{ data: ProjectFile }>(`/projects/${projectId}/files/${fileId}`, { content })
  return res.data.data
}

export async function createFile(
  projectId: string,
  payload: { path: string; content: string; language: string },
): Promise<ProjectFile> {
  const res = await api.post<{ data: ProjectFile }>(`/projects/${projectId}/files`, payload)
  return res.data.data
}

export async function deleteFile(projectId: string, fileId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/files/${fileId}`)
}

export async function getGenerationPlan(projectId: string): Promise<GenerationPlan> {
  const res = await api.get<{ data: GenerationPlan }>(`/projects/${projectId}/generation-plan`)
  return res.data.data
}

export async function exportProjectZip(projectId: string): Promise<Blob> {
  const res = await api.post<Blob>(
    `/projects/${projectId}/export`,
    { format: 'zip', phase: 4 },
    { responseType: 'blob', headers: { Accept: 'application/zip' } },
  )
  return res.data
}
