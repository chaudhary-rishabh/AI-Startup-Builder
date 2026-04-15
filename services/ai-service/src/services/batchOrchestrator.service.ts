import Anthropic from '@anthropic-ai/sdk'

import type { AgentType, ProjectContext } from '@repo/types'

import { env } from '../config/env.js'
import * as generationPlansQueries from '../db/queries/generationPlans.queries.js'
import type { FileSpec } from '../types/phase4.types.js'

import { crossCheck3B, crossCheck3C } from './crossCheck.service.js'
import { estimateCost, selectModel } from './modelRouter.service.js'
import { recordTokenUsage } from './tokenBudget.service.js'
import { publishStreamChunk, publishStreamEvent } from './streamingService.js'

export type { FileSpec } from '../types/phase4.types.js'

export const MAX_COMPLEXITY_WEIGHT = 10
export const COMPLEXITY_WEIGHTS: Record<string, number> = {
  complex: 10,
  medium: 3,
  simple: 1,
}
export const MAX_PARALLEL_BATCHES = 3

const PHASE4_CODE_AGENTS = new Set<string>([
  'schema_generator',
  'api_generator',
  'backend',
  'frontend',
])

function projectServiceBase(): string {
  return env.PROJECT_SERVICE_URL.replace(/\/$/, '')
}

function filterFilesForAgent(agentType: string, files: FileSpec[]): FileSpec[] {
  if (agentType === 'schema_generator') {
    return files.filter((f) => f.layer === 'db')
  }
  if (agentType === 'api_generator') {
    return files.filter((f) => f.layer === 'controller' || f.layer === 'route')
  }
  if (agentType === 'backend') {
    return files.filter((f) =>
      ['db', 'config', 'middleware', 'service', 'controller', 'route'].includes(String(f.layer)),
    )
  }
  if (agentType === 'frontend') {
    return files.filter((f) => String(f.layer).startsWith('frontend'))
  }
  return files
}

export function findParallelGroups(files: FileSpec[]): number[][] {
  const byBatch = new Map<number, FileSpec[]>()
  for (const f of files) {
    const b = f.batchNumber
    if (!byBatch.has(b)) byBatch.set(b, [])
    byBatch.get(b)!.push(f)
  }
  const sortedBatchNums = [...byBatch.keys()].sort((a, b) => a - b)
  const remaining = new Set(sortedBatchNums)
  const groups: number[][] = []

  function independent(a: number, b: number): boolean {
    const filesA = byBatch.get(a) ?? []
    const filesB = byBatch.get(b) ?? []
    const pathsB = new Set(filesB.map((x) => x.path))
    const pathsA = new Set(filesA.map((x) => x.path))
    for (const fa of filesA) {
      for (const dep of fa.dependencies) {
        if (pathsB.has(dep)) return false
      }
    }
    for (const fb of filesB) {
      for (const dep of fb.dependencies) {
        if (pathsA.has(dep)) return false
      }
    }
    return true
  }

  while (remaining.size > 0) {
    const sortedRem = [...remaining].sort((a, b) => a - b)
    const group: number[] = []
    const first = sortedRem[0]!
    remaining.delete(first)
    group.push(first)
    let added = true
    while (added && group.length < MAX_PARALLEL_BATCHES) {
      added = false
      for (const bn of [...remaining].sort((a, b) => a - b)) {
        if (group.every((g) => independent(g, bn))) {
          group.push(bn)
          remaining.delete(bn)
          added = true
          break
        }
      }
    }
    groups.push(group.sort((a, b) => a - b))
  }
  return groups
}

export function getBatchDescription(files: FileSpec[]): string {
  if (files.length === 0) return 'Empty batch'
  const layers = [...new Set(files.map((f) => f.layer))]
  const primary = layers[0] ?? 'misc'
  const label =
    primary === 'db'
      ? 'DB Schema'
      : primary === 'route'
        ? 'Routes'
        : primary === 'service'
          ? 'Services'
          : primary === 'middleware'
            ? 'Middleware'
            : String(primary).startsWith('frontend')
              ? 'Frontend'
              : 'Files'
  return `${label} (${files.length} files)`
}

export function calculateMaxTokens(complexity: string): number {
  if (complexity === 'complex') return 8192
  if (complexity === 'medium') return 4096
  return 2048
}

export function inferLanguage(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.tsx') || lower.endsWith('.ts')) return 'typescript'
  if (lower.endsWith('.jsx') || lower.endsWith('.js')) return 'javascript'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return 'yaml'
  if (lower.endsWith('.md')) return 'markdown'
  if (lower.endsWith('.sql')) return 'sql'
  if (lower.endsWith('.css')) return 'css'
  if (lower.endsWith('.html')) return 'html'
  return 'plaintext'
}

export async function readFileFromProjectFiles(projectId: string, path: string): Promise<string> {
  try {
    const url = `${projectServiceBase()}/internal/projects/${encodeURIComponent(projectId)}/files/content?path=${encodeURIComponent(path)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return ''
    const json = (await res.json()) as { success?: boolean; data?: { content?: string } }
    return typeof json.data?.content === 'string' ? json.data.content : ''
  } catch {
    return ''
  }
}

export async function getAllProjectFiles(
  projectId: string,
): Promise<{ path: string; content: string }[]> {
  try {
    const url = `${projectServiceBase()}/internal/projects/${encodeURIComponent(projectId)}/files`
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) return []
    const json = (await res.json()) as {
      success?: boolean
      data?: { path: string; content: string }[]
    }
    const files = json.data
    return Array.isArray(files) ? files : []
  } catch {
    return []
  }
}

function groupByBatch(files: FileSpec[]): Map<number, FileSpec[]> {
  const m = new Map<number, FileSpec[]>()
  for (const f of files) {
    if (!m.has(f.batchNumber)) m.set(f.batchNumber, [])
    m.get(f.batchNumber)!.push(f)
  }
  return m
}

function buildFilePrompt(
  file: FileSpec,
  priorFiles: { path: string; content: string }[],
  context: ProjectContext,
): { system: string; user: string } {
  const prior =
    priorFiles.length === 0
      ? '(no prior files in this project yet for these dependencies)'
      : priorFiles.map((p) => `--- ${p.path} ---\n${p.content}`).join('\n\n')
  return {
    system:
      'You are a senior engineer. Output ONLY the full file source code for the requested path. No markdown fences, no commentary.',
    user: `Project: ${context.projectName}\nFile path: ${file.path}\nDescription: ${file.description}\nLayer: ${file.layer}\nEstimated lines: ${file.estimatedLines}\n\nPrior dependency files:\n${prior}\n\nWrite the complete file contents now.`,
  }
}

export async function orchestratePhase4(
  runId: string,
  projectId: string,
  userId: string,
  agentType: string,
  context: ProjectContext,
): Promise<void> {
  if (agentType === 'skeleton') {
    return
  }

  if (agentType === 'integration') {
    const plan = await generationPlansQueries.findPlanByProjectId(projectId)
    if (!plan) {
      throw new Error('Run skeleton agent first')
    }
    const allGeneratedFiles = await getAllProjectFiles(projectId)
    const check3C = crossCheck3C(allGeneratedFiles, { totalFiles: plan.totalFiles })
    await publishStreamEvent(runId, 'cross_check', {
      check: '3C',
      passed: check3C.passed,
      issues: check3C.issues,
    })
    return
  }

  if (!PHASE4_CODE_AGENTS.has(agentType)) {
    return
  }

  const planRow = await generationPlansQueries.findPlanByProjectId(projectId)
  if (!planRow) {
    throw new Error('Run skeleton agent first')
  }

  const rawFiles = (planRow.planData as { files?: FileSpec[] } | null)?.files
  const allFiles = Array.isArray(rawFiles) ? rawFiles : []
  const files = filterFilesForAgent(agentType, allFiles)
  if (files.length === 0) {
    await publishStreamEvent(runId, 'batch_complete', {
      batch: 0,
      filesGenerated: 0,
      summary: 'No files assigned to this agent in the generation plan.',
    })
    return
  }

  const byBatch = groupByBatch(files)
  const batchGroups = findParallelGroups(files)
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const model = selectModel(agentType as AgentType)
  let promptTokensTotal = 0
  let completionTokensTotal = 0
  const plan = planRow

  async function runSingleBatch(batchNum: number): Promise<{
    batchNum: number
    batchGenerated: { path: string; content: string }[]
    promptIn: number
    promptOut: number
  }> {
    const batchFiles = byBatch.get(batchNum) ?? []
    let promptIn = 0
    let promptOut = 0
    const batchGenerated: { path: string; content: string }[] = []
    if (batchFiles.length === 0) {
      return { batchNum, batchGenerated, promptIn: 0, promptOut: 0 }
    }

    await publishStreamEvent(runId, 'batch_start', {
      batch: batchNum,
      totalBatches: plan.totalBatches,
      description: getBatchDescription(batchFiles),
    })

    for (const file of batchFiles) {
      await publishStreamEvent(runId, 'file_start', { path: file.path })

      const prior: { path: string; content: string }[] = []
      for (const dep of file.dependencies) {
        const earlier = files.some((f) => f.path === dep && f.batchNumber < file.batchNumber)
        if (!earlier) continue
        const content = await readFileFromProjectFiles(projectId, dep)
        prior.push({ path: dep, content })
      }

      const prompt = buildFilePrompt(file, prior, context)
      let fileContent = ''
      const stream = await client.messages.stream({
        model,
        max_tokens: calculateMaxTokens(file.complexity),
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      })
      for await (const ev of stream) {
        if (
          ev.type === 'content_block_delta' &&
          ev.delta.type === 'text_delta' &&
          'text' in ev.delta
        ) {
          const piece = ev.delta.text
          fileContent += piece
          await publishStreamChunk(runId, piece)
        }
      }
      const final = await stream.finalMessage()
      const usage = final.usage
      promptIn += usage?.input_tokens ?? 0
      promptOut += usage?.output_tokens ?? 0

      const saveUrl = `${projectServiceBase()}/internal/projects/${encodeURIComponent(projectId)}/files`
      await fetch(saveUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service': 'ai-service',
        },
        body: JSON.stringify({
          path: file.path,
          content: fileContent,
          language: inferLanguage(file.path),
          agentType,
        }),
      })

      batchGenerated.push({ path: file.path, content: fileContent })
      await publishStreamEvent(runId, 'file_complete', {
        path: file.path,
        sizeBytes: Buffer.byteLength(fileContent, 'utf8'),
      })
    }

    return { batchNum, batchGenerated, promptIn, promptOut }
  }

  for (const group of batchGroups) {
    const outcomes = await Promise.all(group.map((bn) => runSingleBatch(bn)))
    for (const o of outcomes.sort((a, b) => a.batchNum - b.batchNum)) {
      promptTokensTotal += o.promptIn
      completionTokensTotal += o.promptOut
      const check3B = crossCheck3B(o.batchGenerated)
      await publishStreamEvent(runId, 'cross_check', {
        check: '3B',
        passed: check3B.passed,
        issues: check3B.issues,
      })
      await generationPlansQueries.updatePlanProgress(projectId, {
        completedBatches: o.batchNum,
        status: 'in_progress',
      })
      await publishStreamEvent(runId, 'batch_complete', {
        batch: o.batchNum,
        filesGenerated: o.batchGenerated.length,
      })
    }
  }

  const totalTokens = promptTokensTotal + completionTokensTotal
  const costUsd = estimateCost(model, promptTokensTotal, completionTokensTotal)
  await recordTokenUsage(userId, totalTokens, costUsd)
}
