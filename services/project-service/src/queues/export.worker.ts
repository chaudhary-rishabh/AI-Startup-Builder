import { Worker } from 'bullmq'
import { Redis } from 'ioredis'

import * as exportsQueries from '../db/queries/exports.queries.js'
import { env } from '../config/env.js'
import { getRedis } from '../services/redis.service.js'
import { publishExportCompleted } from '../events/publisher.js'
import { generateDocx } from '../services/docxExport.service.js'
import { generatePdf } from '../services/pdfExport.service.js'
import { generateDownloadUrl, uploadExportToS3 } from '../services/s3.service.js'
import { generateZip } from '../services/zipExport.service.js'

import type { ExportJobData } from './export.queue.js'

const isVitest = process.env.VITEST === 'true'

let workerConnection: Redis | null = null

const DOCX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function processExportJobPayload(data: ExportJobData): Promise<void> {
  const { jobId, projectId, userId, format, includePhases } = data

  await exportsQueries.updateExportStatus(jobId, { status: 'processing', progress: 10 })

  let buffer: Buffer
  let contentType: string

  switch (format) {
    case 'zip':
      buffer = await generateZip(projectId, includePhases)
      contentType = 'application/zip'
      await exportsQueries.updateExportStatus(jobId, { progress: 60 })
      break
    case 'docx':
      buffer = await generateDocx(projectId, includePhases)
      contentType = DOCX_CONTENT_TYPE
      await exportsQueries.updateExportStatus(jobId, { progress: 60 })
      break
    case 'pdf':
      buffer = await generatePdf(projectId, includePhases)
      contentType = 'application/pdf'
      await exportsQueries.updateExportStatus(jobId, { progress: 60 })
      break
    default: {
      const x: never = format
      throw new Error(`Unsupported format: ${String(x)}`)
    }
  }

  const ext = format === 'docx' ? 'docx' : format === 'pdf' ? 'pdf' : 'zip'
  const s3Key = `exports/${userId}/${projectId}/${jobId}.${ext}`

  await uploadExportToS3(s3Key, buffer, contentType)
  await exportsQueries.updateExportStatus(jobId, { progress: 90 })

  const downloadUrl = await generateDownloadUrl(s3Key)
  const expiresAt = new Date(Date.now() + 3600 * 1000)

  await exportsQueries.updateExportStatus(jobId, {
    status: 'complete',
    progress: 100,
    s3Key,
    downloadUrl,
    expiresAt,
    fileSizeBytes: buffer.length,
  })

  await publishExportCompleted(userId, projectId, jobId, downloadUrl, expiresAt.toISOString())
}

export async function runExportJob(data: ExportJobData): Promise<void> {
  try {
    await processExportJobPayload(data)
  } catch (error) {
    await exportsQueries.updateExportStatus(data.jobId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Export failed',
    })
    throw error
  }
}

export function startExportWorker(): Worker<ExportJobData> {
  workerConnection = isVitest
    ? (getRedis() as Redis)
    : new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
  return new Worker<ExportJobData>(
    'project-exports',
    async (job: { data: ExportJobData }) => {
      await runExportJob(job.data)
    },
    {
      connection: workerConnection,
      concurrency: 3,
    },
  )
}

export async function shutdownExportWorker(worker: Worker): Promise<void> {
  await worker.close()
  if (workerConnection && !isVitest) {
    await workerConnection.quit()
    workerConnection = null
  } else {
    workerConnection = null
  }
}
