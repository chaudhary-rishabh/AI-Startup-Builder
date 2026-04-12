import { beforeEach, describe, expect, it, vi } from 'vitest'

const queueMocks = vi.hoisted(() => ({
  add: vi.fn(),
}))

const exportsMocks = vi.hoisted(() => ({
  createExportJob: vi.fn(),
  findExportByJobId: vi.fn(),
}))

const projectsMocks = vi.hoisted(() => ({
  findProjectByIdAndUserId: vi.fn(),
}))

const pubMocks = vi.hoisted(() => ({
  publishProjectExportRequested: vi.fn(),
}))

vi.mock('../../src/queues/export.queue.js', () => ({
  exportQueue: { add: queueMocks.add, close: vi.fn() },
  closeExportQueue: vi.fn(),
}))
vi.mock('../../src/db/queries/exports.queries.js', () => exportsMocks)
vi.mock('../../src/db/queries/projects.queries.js', () => projectsMocks)
vi.mock('../../src/events/publisher.js', () => pubMocks)

import { createApp } from '../../src/app.js'
import { getRedis } from '../../src/services/redis.service.js'
import { signTestAccessToken } from '../jwt-test.js'

const uid = '550e8400-e29b-41d4-a716-446655440000'
const pid = '660e8400-e29b-41d4-a716-446655440001'
const jobId = '770e8400-e29b-41d4-a716-446655440002'

describe('export routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string

  beforeEach(async () => {
    vi.clearAllMocks()
    await getRedis().flushall()
    app = createApp()
    token = await signTestAccessToken({ sub: uid })
    projectsMocks.findProjectByIdAndUserId.mockResolvedValue({
      id: pid,
      name: 'P',
    } as never)
    exportsMocks.createExportJob.mockResolvedValue({ jobId } as never)
    queueMocks.add.mockResolvedValue({} as never)
    pubMocks.publishProjectExportRequested.mockResolvedValue(undefined)
  })

  it('POST /projects/:id/export zip → 202 with jobId and pollUrl', async () => {
    const res = await app.request(`http://localhost/projects/${pid}/export`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ format: 'zip' }),
    })
    expect(res.status).toBe(202)
    const json = (await res.json()) as {
      data: { jobId: string; pollUrl: string; status: string }
    }
    expect(json.data.status).toBe('queued')
    expect(json.data.pollUrl).toBe(`/projects/${pid}/export/${json.data.jobId}`)
    expect(queueMocks.add).toHaveBeenCalled()
  })

  it('POST /projects/:id/export unknown format → 422', async () => {
    const res = await app.request(`http://localhost/projects/${pid}/export`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ format: 'tar' }),
    })
    expect(res.status).toBe(422)
  })

  it('POST /projects/:id/export 4th time in a minute → 429 RATE_LIMITED', async () => {
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    const body = JSON.stringify({ format: 'zip' })
    for (let i = 0; i < 3; i++) {
      const res = await app.request(`http://localhost/projects/${pid}/export`, {
        method: 'POST',
        headers,
        body,
      })
      expect(res.status).toBe(202)
    }
    const fourth = await app.request(`http://localhost/projects/${pid}/export`, {
      method: 'POST',
      headers,
      body,
    })
    expect(fourth.status).toBe(429)
    const json = (await fourth.json()) as { success: false; error: { code: string } }
    expect(json.error.code).toBe('RATE_LIMITED')
  })

  it('GET /projects/:id/export/:jobId → 200 with status=queued', async () => {
    exportsMocks.findExportByJobId.mockResolvedValue({
      jobId,
      status: 'queued',
      format: 'zip',
      progress: 0,
      downloadUrl: null,
      fileSizeBytes: null,
      expiresAt: null,
      errorMessage: null,
      createdAt: new Date(),
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/export/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { status: string; progress: number } }
    expect(json.data.status).toBe('queued')
    expect(json.data.progress).toBe(0)
  })

  it('GET /projects/:id/export/:jobId status=complete → includes downloadUrl', async () => {
    exportsMocks.findExportByJobId.mockResolvedValue({
      jobId,
      status: 'complete',
      format: 'zip',
      progress: 100,
      downloadUrl: 'https://example.com/file.zip',
      fileSizeBytes: 1234,
      expiresAt: new Date(),
      errorMessage: null,
      createdAt: new Date(),
    } as never)

    const res = await app.request(`http://localhost/projects/${pid}/export/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: { downloadUrl: string | null } }
    expect(json.data.downloadUrl).toBe('https://example.com/file.zip')
  })

  it('GET /projects/:id/export/:jobId wrong userId → 404', async () => {
    exportsMocks.findExportByJobId.mockResolvedValue(undefined)

    const res = await app.request(`http://localhost/projects/${pid}/export/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(404)
    const json = (await res.json()) as { success: false; error: { code: string } }
    expect(json.error.code).toBe('EXPORT_JOB_NOT_FOUND')
  })

  it('GET /projects/:id/export/nonexistent → 404', async () => {
    exportsMocks.findExportByJobId.mockResolvedValue(undefined)

    const res = await app.request(
      `http://localhost/projects/${pid}/export/00000000-0000-4000-8000-000000000099`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    expect(res.status).toBe(404)
  })
})
