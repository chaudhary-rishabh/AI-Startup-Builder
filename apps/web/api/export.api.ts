import api from '@/lib/axios'

export interface ExportJob {
  jobId: string
  status: 'pending' | 'processing' | 'complete' | 'failed'
  format: 'docx' | 'zip' | 'json' | 'html'
  downloadUrl: string | null
  createdAt: string
  completedAt: string | null
}

export async function createExportJob(payload: {
  projectId: string
  format: 'docx' | 'zip' | 'json' | 'html'
  includePhases?: number[]
}): Promise<ExportJob> {
  const { projectId, ...body } = payload
  const res = await api.post<{ data: ExportJob }>(`/projects/${projectId}/export`, body)
  return res.data.data
}

export async function getExportJob(projectId: string, jobId: string): Promise<ExportJob> {
  const res = await api.get<{ data: ExportJob }>(`/projects/${projectId}/export/${jobId}`)
  return res.data.data
}

export function downloadExport(downloadUrl: string, filename = 'export'): void {
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = filename
  anchor.rel = 'noopener noreferrer'
  anchor.target = '_blank'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}
