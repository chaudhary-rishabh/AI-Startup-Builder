import { describe, expect, it } from 'vitest'

import { deleteDocument, deleteNamespace, getNamespaceStats, listDocuments } from '@/api/rag.api'

describe('rag.api', () => {
  it('getNamespaceStats returns stats object', async () => {
    const stats = await getNamespaceStats()
    expect(stats.docCount).toBeDefined()
    expect(stats.docLimit).toBeDefined()
    expect(['active', 'empty', 'at_limit']).toContain(stats.status)
  })

  it('listDocuments returns array with status field', async () => {
    const docs = await listDocuments()
    expect(Array.isArray(docs)).toBe(true)
    expect(docs[0]?.status).toBeDefined()
  })

  it('deleteDocument calls DELETE /rag/documents/:id', async () => {
    await expect(deleteDocument('doc-1')).resolves.toBeUndefined()
  })

  it('deleteNamespace calls DELETE /rag/namespace', async () => {
    await expect(deleteNamespace()).resolves.toBeUndefined()
  })
})
