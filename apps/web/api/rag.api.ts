import api from '@/lib/axios'

export interface RagDocument {
  id: string
  filename: string
  fileType: 'pdf' | 'txt' | 'md' | 'docx'
  fileSizeBytes: number
  status: 'pending' | 'processing' | 'indexed' | 'failed'
  chunkCount: number
  source: 'upload' | 'url'
  customInstructions: string | null
  createdAt: string
  indexedAt: string | null
}

export interface RagNamespaceStats {
  namespace: string
  docCount: number
  docLimit: number
  chunkCount: number
  chunkLimit: number
  docUsagePercent: number
  status: 'active' | 'empty' | 'at_limit'
  lastIndexedAt: string | null
}

export async function getNamespaceStats(): Promise<RagNamespaceStats> {
  const res = await api.get<{ data: RagNamespaceStats }>('/rag/namespace')
  return res.data.data
}

export async function listDocuments(): Promise<RagDocument[]> {
  const res = await api.get<{ data: RagDocument[] }>('/rag/documents')
  return res.data.data
}

export async function uploadDocument(
  file: File,
  customInstructions?: string,
): Promise<{ docId: string; status: 'processing'; estimatedMs: number }> {
  const formData = new FormData()
  formData.append('file', file)
  if (customInstructions) formData.append('customInstructions', customInstructions)
  const res = await api.post<{ data: { docId: string; status: 'processing'; estimatedMs: number } }>('/rag/documents', formData)
  return res.data.data
}

export async function ingestUrl(
  url: string,
  customInstructions?: string,
): Promise<{ docId: string; status: 'processing' }> {
  const res = await api.post<{ data: { docId: string; status: 'processing' } }>('/rag/ingest-url', {
    url,
    ...(customInstructions ? { customInstructions } : {}),
  })
  return res.data.data
}

export async function deleteDocument(docId: string): Promise<void> {
  await api.delete(`/rag/documents/${docId}`)
}

export async function deleteNamespace(): Promise<void> {
  await api.delete('/rag/namespace')
}
