import { beforeEach, describe, expect, it, vi } from 'vitest'

const exportStatusMocks = vi.hoisted(() => ({
  updateExportStatus: vi.fn(),
}))

const zipMocks = vi.hoisted(() => ({
  generateZip: vi.fn(),
}))
const docxMocks = vi.hoisted(() => ({
  generateDocx: vi.fn(),
}))
const pdfMocks = vi.hoisted(() => ({
  generatePdf: vi.fn(),
}))
const s3Mocks = vi.hoisted(() => ({
  uploadExportToS3: vi.fn(),
  generateDownloadUrl: vi.fn(),
}))
const publishMocks = vi.hoisted(() => ({
  publishExportCompleted: vi.fn(),
}))

vi.mock('../../src/db/queries/exports.queries.js', () => exportStatusMocks)
vi.mock('../../src/services/zipExport.service.js', () => zipMocks)
vi.mock('../../src/services/docxExport.service.js', () => docxMocks)
vi.mock('../../src/services/pdfExport.service.js', () => pdfMocks)
vi.mock('../../src/services/s3.service.js', () => s3Mocks)
vi.mock('../../src/events/publisher.js', () => publishMocks)

import { processExportJobPayload, runExportJob } from '../../src/queues/export.worker.js'

const baseJob = {
  jobId: 'job-1',
  projectId: 'p1',
  userId: 'u1',
  includePhases: [1, 2] as number[],
}

describe('export worker processExportJobPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    zipMocks.generateZip.mockResolvedValue(Buffer.from('zip-bytes'))
    docxMocks.generateDocx.mockResolvedValue(Buffer.from('docx-bytes'))
    pdfMocks.generatePdf.mockResolvedValue(Buffer.from('pdf-bytes'))
    s3Mocks.uploadExportToS3.mockResolvedValue(undefined)
    s3Mocks.generateDownloadUrl.mockResolvedValue('https://signed.example/get')
    exportStatusMocks.updateExportStatus.mockResolvedValue({} as never)
    publishMocks.publishExportCompleted.mockResolvedValue(undefined)
  })

  it('calls zip generator for zip format', async () => {
    await processExportJobPayload({ ...baseJob, format: 'zip' })
    expect(zipMocks.generateZip).toHaveBeenCalledWith('p1', [1, 2])
    expect(docxMocks.generateDocx).not.toHaveBeenCalled()
    expect(pdfMocks.generatePdf).not.toHaveBeenCalled()
  })

  it('calls docx generator for docx format', async () => {
    await processExportJobPayload({ ...baseJob, format: 'docx' })
    expect(docxMocks.generateDocx).toHaveBeenCalledWith('p1', [1, 2])
  })

  it('calls pdf generator for pdf format', async () => {
    await processExportJobPayload({ ...baseJob, format: 'pdf' })
    expect(pdfMocks.generatePdf).toHaveBeenCalledWith('p1', [1, 2])
  })

  it('uploads to S3 after generation', async () => {
    await processExportJobPayload({ ...baseJob, format: 'zip' })
    expect(s3Mocks.uploadExportToS3).toHaveBeenCalledWith(
      'exports/u1/p1/job-1.zip',
      expect.any(Buffer),
      'application/zip',
    )
  })

  it('updates status to complete and publishes event on success', async () => {
    await processExportJobPayload({ ...baseJob, format: 'zip' })
    expect(publishMocks.publishExportCompleted).toHaveBeenCalledWith(
      'u1',
      'p1',
      'job-1',
      'https://signed.example/get',
      expect.any(String),
    )
    const calls = exportStatusMocks.updateExportStatus.mock.calls
    expect(calls.some((c) => c[1]?.status === 'complete' && c[1]?.progress === 100)).toBe(true)
  })

  it('updates failed and rethrows on error', async () => {
    zipMocks.generateZip.mockRejectedValue(new Error('zip boom'))
    await expect(runExportJob({ ...baseJob, format: 'zip' })).rejects.toThrow('zip boom')
    expect(exportStatusMocks.updateExportStatus).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ status: 'failed', errorMessage: 'zip boom' }),
    )
  })

  it('updates progress at 10%, 60%, 90%, 100%', async () => {
    await processExportJobPayload({ ...baseJob, format: 'zip' })
    const progresses = exportStatusMocks.updateExportStatus.mock.calls
      .map((c) => c[1]?.progress)
      .filter((p): p is number => typeof p === 'number')
    expect(progresses).toContain(10)
    expect(progresses).toContain(60)
    expect(progresses).toContain(90)
    expect(progresses).toContain(100)
  })
})
