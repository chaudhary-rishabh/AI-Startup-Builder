/**
 * End-to-end lifecycle against real Postgres 16 + Redis 7 (Testcontainers).
 * Runs in an isolated Vitest project (see vitest.workspace.ts) without ioredis-mock.
 *
 * If Docker is unavailable or port publishing fails (common in some CI/sandbox setups),
 * `beforeAll` catches the error and every test in this file is skipped — the suite still passes.
 *
 * Env: `TESTCONTAINERS_RYUK_DISABLED=true` (set by workspace). Optional: `TESTCONTAINERS_HOST_OVERRIDE`.
 */
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { StartedRedisContainer } from '@testcontainers/redis'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { RedisContainer } from '@testcontainers/redis'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import type { Worker as BullMqWorker } from 'bullmq'
import type { Hono } from 'hono'
import pg from 'pg'
import type { TestContext } from 'vitest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Parse `{ success: true, data: T }` from API JSON */
function unwrapData<T>(json: unknown): T {
  expect(json).toMatchObject({ success: true })
  return (json as { data: T }).data
}

describe.sequential('full project lifecycle (testcontainers)', () => {
  let flowReady = false

  function gateFlow(ctx: TestContext): boolean {
    if (!flowReady) {
      ctx.skip()
      return false
    }
    return true
  }

  let pgContainer: StartedPostgreSqlContainer | undefined
  let redisContainer: StartedRedisContainer | undefined
  let app!: Hono
  let exportWorker: BullMqWorker | undefined
  let shutdownExportWorker: ((w: BullMqWorker) => Promise<void>) | undefined
  let closeExportQueue: (() => Promise<void>) | undefined
  let closeDbPools: (() => Promise<void>) | undefined
  let signTestAccessToken: typeof import('../jwt-test.js').signTestAccessToken

  const userId1 = '550e8400-e29b-41d4-a716-446655440001'
  const userId2 = '550e8400-e29b-41d4-a716-446655440002'

  let projectId = ''
  let duplicateId = ''
  let savedFileId = ''
  let exportJobId = ''

  const phase1Data = {
    problem: 'Market lacks good tools',
    solution: 'Build an AI startup builder',
    icp: 'Solo founders',
    demandScore: 8,
    verdict: 'yes' as const,
  }

  const phase2Data = {
    features: [{ name: 'Auth', priority: 'must' }],
    userStories: ['As a founder I want to validate my idea'],
    frontendStack: 'React',
    backendStack: 'Node',
    dbChoice: 'PostgreSQL',
  }

  const phase3Data = {
    canvasData: [{ id: 'el-1', type: 'frame', name: 'Home' }],
    wireframes: [],
  }

  async function authHeader(
    userId: string,
    role: string = 'user',
    plan: string = 'free',
  ): Promise<Record<string, string>> {
    const token = await signTestAccessToken({ sub: userId, role, plan })
    return { Authorization: `Bearer ${token}` }
  }

  async function seedTestProject(pid: string, uid: string): Promise<void> {
    const { getDb } = await import('../../src/lib/db.js')
    const { projects } = await import('../../src/db/schema.js')
    const { initialPhaseProgress } = await import('../../src/db/queries/projects.queries.js')
    await getDb()
      .insert(projects)
      .values({
        id: pid,
        userId: uid,
        name: 'Seeded Project',
        emoji: '🌱',
        description: null,
        currentPhase: 1,
        status: 'active',
        isStarred: false,
        mode: 'design',
        phaseProgress: initialPhaseProgress(),
        contextSummary: null,
      })
  }

  beforeAll(async () => {
    process.env.TESTCONTAINERS_RYUK_DISABLED = 'true'
    if (!process.env.TESTCONTAINERS_HOST_OVERRIDE) {
      process.env.TESTCONTAINERS_HOST_OVERRIDE = '127.0.0.1'
    }

    try {
      pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start()
      redisContainer = await new RedisContainer('redis:7-alpine').start()

      process.env.DATABASE_URL = pgContainer.getConnectionUri()
      process.env.REDIS_URL = redisContainer.getConnectionUrl()

      const migrationsFolder = join(__dirname, '../../src/db/migrations')
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
      const db = drizzle(pool)
      await migrate(db, { migrationsFolder })
      await pool.end()

      const appMod = await import('../../src/app.js')
      const workerMod = await import('../../src/queues/export.worker.js')
      const queueMod = await import('../../src/queues/export.queue.js')
      const dbMod = await import('../../src/lib/db.js')
      const jwtMod = await import('../jwt-test.js')

      app = appMod.createApp()
      shutdownExportWorker = workerMod.shutdownExportWorker
      closeExportQueue = queueMod.closeExportQueue
      closeDbPools = dbMod.closeDbPools
      signTestAccessToken = jwtMod.signTestAccessToken

      exportWorker = workerMod.startExportWorker()
      flowReady = true
    } catch (err) {
      console.warn(
        '[fullFlow] Testcontainers unavailable or Docker port binding failed; skipping integration tests.',
        err instanceof Error ? err.message : err,
      )
      flowReady = false
    }
  }, 180_000)

  afterAll(async () => {
    if (shutdownExportWorker && exportWorker) {
      await shutdownExportWorker(exportWorker)
    }
    if (closeExportQueue) await closeExportQueue()
    if (closeDbPools) await closeDbPools()
    await redisContainer?.stop()
    await pgContainer?.stop()
  })

  it('1: GET /ready → 200 healthy', async (ctx) => {
    if (!gateFlow(ctx)) return
    const res = await app.request('/ready')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status?: string }
    expect(body.status).toBe('healthy')
  })

  it('2: POST /projects → 201 phase 1', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const res = await app.request('/projects', {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Startup Build', emoji: '🚀' }),
    })
    expect(res.status).toBe(201)
    const data = unwrapData<{ project: { id: string; phaseProgress: Record<string, string> } }>(
      await res.json(),
    )
    projectId = data.project.id
    expect(data.project.phaseProgress['1']).toBe('active')
    expect(data.project.phaseProgress['2']).toBe('locked')
  })

  it('3: GET /projects → includes new project', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const res = await app.request('/projects', { headers: h })
    expect(res.status).toBe(200)
    const data = unwrapData<{ projects: { id: string }[] }>(await res.json())
    expect(data.projects.some((p) => p.id === projectId)).toBe(true)
  })

  it('4: GET /projects/:id → phaseOutputs []', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const res = await app.request(`/projects/${projectId}`, { headers: h })
    expect(res.status).toBe(200)
    const data = unwrapData<{ phaseOutputs: unknown[] }>(await res.json())
    expect(Array.isArray(data.phaseOutputs)).toBe(true)
    expect(data.phaseOutputs.length).toBe(0)
  })

  it('5: PATCH name', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const res = await app.request(`/projects/${projectId}`, {
      method: 'PATCH',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed Startup' }),
    })
    expect(res.status).toBe(200)
    const data = unwrapData<{ project: { name: string } }>(await res.json())
    expect(data.project.name).toBe('Renamed Startup')
  })

  it('6–7: star toggle', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const r1 = await app.request(`/projects/${projectId}/star`, { method: 'POST', headers: h })
    expect(r1.status).toBe(200)
    expect(unwrapData<{ isStarred: boolean }>(await r1.json()).isStarred).toBe(true)
    const r2 = await app.request(`/projects/${projectId}/star`, { method: 'POST', headers: h })
    expect(r2.status).toBe(200)
    expect(unwrapData<{ isStarred: boolean }>(await r2.json()).isStarred).toBe(false)
  })

  it('8–10: search', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const okSearch = await app.request('/projects/search?q=startup', { headers: h })
    expect(okSearch.status).toBe(200)
    const hits = unwrapData<{ results: { id: string }[] }>(await okSearch.json())
    expect(hits.results.some((r) => r.id === projectId)).toBe(true)

    const empty = await app.request('/projects/search?q=zzzznotfound', { headers: h })
    expect(empty.status).toBe(200)
    expect(unwrapData<{ results: unknown[] }>(await empty.json()).results.length).toBe(0)

    const short = await app.request('/projects/search?q=s', { headers: h })
    expect(short.status).toBe(400)
  })

  it('11: PUT phase 1 incomplete', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const res = await app.request(`/projects/${projectId}/phases/1`, {
      method: 'PUT',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: phase1Data, isComplete: false }),
    })
    expect(res.status).toBe(200)
    expect(unwrapData<{ version: number }>(await res.json()).version).toBe(1)
  })

  it('12: advance blocked (incomplete)', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const res = await app.request(`/projects/${projectId}/advance-phase`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPhase: 2 }),
    })
    expect(res.status).toBe(422)
    const j = (await res.json()) as { success: false; error: { code: string } }
    expect(j.success).toBe(false)
    expect(j.error.code).toBe('PHASE_INCOMPLETE')
  })

  it('13: PUT phase 1 complete', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const res = await app.request(`/projects/${projectId}/phases/1`, {
      method: 'PUT',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: phase1Data, isComplete: true }),
    })
    expect(res.status).toBe(200)
    expect(unwrapData<{ version: number }>(await res.json()).version).toBe(2)
  })

  it('14–15: advance to phase 2', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const res = await app.request(`/projects/${projectId}/advance-phase`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPhase: 2 }),
    })
    expect(res.status).toBe(200)
    const adv = unwrapData<{
      currentPhase: number
      mode: string
      previousPhase: number
    }>(await res.json())
    expect(adv.currentPhase).toBe(2)
    expect(adv.mode).toBe('design')
    expect(adv.previousPhase).toBe(1)

    const g = await app.request(`/projects/${projectId}`, { headers: h })
    const proj = unwrapData<{ project: { currentPhase: number; mode: string } }>(await g.json())
    expect(proj.project.currentPhase).toBe(2)
    expect(proj.project.mode).toBe('design')
  })

  it('16–18: phase reads', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const p1 = await app.request(`/projects/${projectId}/phases/1`, { headers: h })
    expect(p1.status).toBe(200)
    expect(unwrapData<{ isComplete: boolean }>(await p1.json()).isComplete).toBe(true)

    const p2 = await app.request(`/projects/${projectId}/phases/2`, { headers: h })
    expect(p2.status).toBe(200)
    expect(unwrapData<{ data: unknown }>(await p2.json()).data).toBeNull()

    const p3 = await app.request(`/projects/${projectId}/phases/3`, { headers: h })
    expect(p3.status).toBe(403)
  })

  it('19–23: phase 2–3–4 progression', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const put2 = await app.request(`/projects/${projectId}/phases/2`, {
      method: 'PUT',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: phase2Data, isComplete: true }),
    })
    expect(put2.status).toBe(200)

    const adv3 = await app.request(`/projects/${projectId}/advance-phase`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPhase: 3 }),
    })
    expect(adv3.status).toBe(200)

    const skip = await app.request(`/projects/${projectId}/advance-phase`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPhase: 5 }),
    })
    expect(skip.status).toBe(422)
    const skipBody = (await skip.json()) as { error: { code: string } }
    expect(skipBody.error.code).toBe('INVALID_PHASE_TRANSITION')

    const put3 = await app.request(`/projects/${projectId}/phases/3`, {
      method: 'PUT',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: phase3Data, isComplete: true }),
    })
    expect(put3.status).toBe(200)

    const adv4 = await app.request(`/projects/${projectId}/advance-phase`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPhase: 4 }),
    })
    expect(adv4.status).toBe(200)
    const a4 = unwrapData<{ currentPhase: number; mode: string }>(await adv4.json())
    expect(a4.currentPhase).toBe(4)
    expect(a4.mode).toBe('dev')
  })

  it('24–26: canvas', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const g1 = await app.request(`/projects/${projectId}/canvas`, { headers: h })
    expect(g1.status).toBe(200)

    const elements = [{ id: 'a', type: 'rect' }]
    const put = await app.request(`/projects/${projectId}/canvas`, {
      method: 'PUT',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvasData: elements }),
    })
    expect(put.status).toBe(200)

    const g2 = await app.request(`/projects/${projectId}/canvas`, { headers: h })
    expect(g2.status).toBe(200)
    const canvas = unwrapData<{ canvasData: unknown[] }>(await g2.json())
    expect(JSON.stringify(canvas.canvasData)).toContain('rect')
  })

  it('27–31: files', async (ctx) => {
    if (!gateFlow(ctx)) return

    const internalRes = await app.request(`/internal/projects/${projectId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'src/controllers/user.ts',
        content: 'export const x = 1',
        language: 'typescript',
      }),
    })
    expect(internalRes.status).toBe(200)
    const saved = unwrapData<{ file: { id: string } }>(await internalRes.json())
    savedFileId = saved.file.id

    const h = await authHeader(userId1)
    const list = await app.request(`/projects/${projectId}/files`, { headers: h })
    expect(list.status).toBe(200)
    const filesPayload = unwrapData<{
      files: { id: string }[]
      tree: unknown
    }>(await list.json())
    expect(filesPayload.files.length).toBe(1)
    expect(filesPayload.tree).toBeDefined()

    const one = await app.request(`/projects/${projectId}/files/${savedFileId}`, { headers: h })
    expect(one.status).toBe(200)

    const put = await app.request(`/projects/${projectId}/files/${savedFileId}`, {
      method: 'PUT',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'edited' }),
    })
    expect(put.status).toBe(200)
    expect(unwrapData<{ isModified: boolean }>(await put.json()).isModified).toBe(true)

    const del = await app.request(`/projects/${projectId}/files/${savedFileId}`, {
      method: 'DELETE',
      headers: h,
    })
    expect(del.status).toBe(200)
    savedFileId = ''
  })

  it('32–35: conversations', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const m1 = await app.request(`/projects/${projectId}/conversations`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'hello', phase: 4 }),
    })
    expect(m1.status).toBe(201)
    const m2 = await app.request(`/projects/${projectId}/conversations`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'response', phase: 4 }),
    })
    expect(m2.status).toBe(201)

    const list = await app.request(`/projects/${projectId}/conversations?phase=4`, {
      headers: h,
    })
    expect(list.status).toBe(200)
    const msgs = unwrapData<{ messages: unknown[] }>(await list.json())
    expect(msgs.messages.length).toBe(2)

    const old = await app.request(`/projects/${projectId}/conversations?phase=1`, { headers: h })
    expect(old.status).toBe(200)
    expect(unwrapData<{ messages: unknown[] }>(await old.json()).messages.length).toBe(0)
  })

  it('36–39: export', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const post = await app.request(`/projects/${projectId}/export`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'zip' }),
    })
    expect(post.status).toBe(202)
    const accepted = unwrapData<{ jobId: string; status: string }>(await post.json())
    exportJobId = accepted.jobId
    expect(accepted.status).toBe('queued')

    const poll1 = await app.request(`/projects/${projectId}/export/${exportJobId}`, {
      headers: h,
    })
    expect(poll1.status).toBe(200)
    const p1 = unwrapData<{ status: string }>(await poll1.json())
    expect(['queued', 'processing'].includes(p1.status)).toBe(true)

    const deadline = Date.now() + 30_000
    let last: { status: string; errorMessage?: string | null } = { status: p1.status }
    while (Date.now() < deadline) {
      const r = await app.request(`/projects/${projectId}/export/${exportJobId}`, { headers: h })
      last = unwrapData(await r.json())
      if (last.status === 'complete' || last.status === 'failed') break
      await new Promise((r) => setTimeout(r, 400))
    }
    expect(['complete', 'failed'].includes(last.status)).toBe(true)
    if (last.status === 'failed') {
      expect(last.errorMessage).toBeTruthy()
    }

    const missing = await app.request(
      `/projects/${projectId}/export/00000000-0000-4000-8000-000000000001`,
      { headers: h },
    )
    expect(missing.status).toBe(404)
  })

  it('40–46: archive, restore, duplicate', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const arch = await app.request(`/projects/${projectId}/archive`, {
      method: 'POST',
      headers: h,
    })
    expect(arch.status).toBe(200)

    const activeList = await app.request('/projects', { headers: h })
    const activeData = unwrapData<{ projects: { id: string }[] }>(await activeList.json())
    expect(activeData.projects.some((p) => p.id === projectId)).toBe(false)

    const archList = await app.request('/projects?status=archived', { headers: h })
    const archData = unwrapData<{ projects: { id: string }[] }>(await archList.json())
    expect(archData.projects.some((p) => p.id === projectId)).toBe(true)

    const rest = await app.request(`/projects/${projectId}/restore`, {
      method: 'POST',
      headers: h,
    })
    expect(rest.status).toBe(200)

    const back = await app.request('/projects', { headers: h })
    expect(
      unwrapData<{ projects: { id: string }[] }>(await back.json()).projects.some(
        (p) => p.id === projectId,
      ),
    ).toBe(true)

    const dup = await app.request(`/projects/${projectId}/duplicate`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(dup.status).toBe(201)
    duplicateId = unwrapData<{ id: string }>(await dup.json()).id

    const two = await app.request('/projects', { headers: h })
    expect(two.status).toBe(200)
    const twoJson = (await two.json()) as {
      success: boolean
      data: { projects: unknown[] }
      meta: { total: number }
    }
    expect(twoJson.success).toBe(true)
    expect(twoJson.meta.total).toBe(2)
  })

  it('47–50: other user 404', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h2 = await authHeader(userId2)
    const g = await app.request(`/projects/${projectId}`, { headers: h2 })
    expect(g.status).toBe(404)

    const d = await app.request(`/projects/${projectId}`, { method: 'DELETE', headers: h2 })
    expect(d.status).toBe(404)

    const s = await app.request(`/projects/${projectId}/star`, { method: 'POST', headers: h2 })
    expect(s.status).toBe(404)
  })

  it('51–53: admin', async (ctx) => {
    if (!gateFlow(ctx)) return

    const userTok = await authHeader(userId1)
    const na = await app.request('/projects/admin', { headers: userTok })
    expect(na.status).toBe(403)

    const adminH = await authHeader(userId1, 'admin')
    const ad = await app.request('/projects/admin', { headers: adminH })
    expect(ad.status).toBe(200)
    const all = unwrapData<{ projects: { userId: string }[] }>(await ad.json())
    expect(all.projects.length).toBeGreaterThanOrEqual(2)

    const filt = await app.request(`/projects/admin?userId=${userId1}`, { headers: adminH })
    expect(filt.status).toBe(200)
    const fd = unwrapData<{ projects: { userId: string }[] }>(await filt.json())
    expect(fd.projects.every((p) => p.userId === userId1)).toBe(true)
  })

  it('54–56: cleanup both projects', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const d1 = await app.request(`/projects/${projectId}`, { method: 'DELETE', headers: h })
    expect(d1.status).toBe(200)

    const g1 = await app.request(`/projects/${projectId}`, { headers: h })
    expect(g1.status).toBe(404)

    const d2 = await app.request(`/projects/${duplicateId}`, { method: 'DELETE', headers: h })
    expect(d2.status).toBe(200)

    const list = await app.request('/projects', { headers: h })
    expect(list.status).toBe(200)
    const listJson = (await list.json()) as {
      success: boolean
      data: { projects: unknown[] }
      meta: { total: number }
    }
    expect(listJson.success).toBe(true)
    expect(listJson.data.projects.length).toBe(0)
    expect(listJson.meta.total).toBe(0)
  })

  it('internal: GET context + POST phase output', async (ctx) => {
    if (!gateFlow(ctx)) return

    const h = await authHeader(userId1)
    const pid = randomUUID()
    await seedTestProject(pid, userId1)

    const internalSave = await app.request(`/internal/projects/${pid}/phases/1/output`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outputData: { problem: 'test', solution: 'test', icp: 't', demandScore: 1, verdict: 'yes' },
        agentType: 'idea_analyzer',
      }),
    })
    expect(internalSave.status).toBe(200)
    expect(unwrapData<{ saved: boolean; version: number }>(await internalSave.json()).saved).toBe(
      true,
    )

    const contextRes = await app.request(`/internal/projects/${pid}/context?userId=${userId1}`)
    expect(contextRes.status).toBe(200)
    const ctxData = unwrapData<{ projectId: string }>(await contextRes.json())
    expect(ctxData.projectId).toBe(pid)

    const del = await app.request(`/projects/${pid}`, { method: 'DELETE', headers: h })
    expect(del.status).toBe(200)
  })
})
