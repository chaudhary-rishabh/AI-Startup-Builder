import { getRedis } from '../services/redis.service.js'

const STREAM_KEY = 'platform:events'

export async function publishEvent<T extends Record<string, unknown>>(
  type: string,
  payload: T,
): Promise<void> {
  const redis = getRedis()
  await redis.xadd(
    STREAM_KEY,
    'MAXLEN',
    '~',
    '100000',
    '*',
    'type',
    type,
    'payload',
    JSON.stringify(payload),
    'timestamp',
    new Date().toISOString(),
    'source',
    'project-service',
    'version',
    '1',
  )
}

export async function publishProjectCreated(
  projectId: string,
  userId: string,
  name: string,
): Promise<void> {
  await publishEvent('project.created', {
    projectId,
    userId,
    name,
    createdAt: new Date().toISOString(),
  } as Record<string, unknown>)
}

export async function publishProjectPhaseAdvanced(
  projectId: string,
  userId: string,
  fromPhase: number,
  toPhase: number,
): Promise<void> {
  await publishEvent('project.phase_advanced', {
    projectId,
    userId,
    fromPhase,
    toPhase,
    advancedAt: new Date().toISOString(),
  } as Record<string, unknown>)
}

export async function publishProjectDeleted(projectId: string, userId: string): Promise<void> {
  await publishEvent('project.deleted', {
    projectId,
    userId,
    deletedAt: new Date().toISOString(),
  } as Record<string, unknown>)
}

export async function publishProjectDuplicated(
  originalId: string,
  newId: string,
  userId: string,
): Promise<void> {
  await publishEvent('project.duplicated', {
    originalId,
    newId,
    userId,
    duplicatedAt: new Date().toISOString(),
  } as Record<string, unknown>)
}

export async function publishProjectExportRequested(
  projectId: string,
  format: string,
  jobId: string,
  includePhases: number[],
): Promise<void> {
  await publishEvent('project.export_requested', {
    projectId,
    format,
    jobId,
    includePhases,
    requestedAt: new Date().toISOString(),
  } as Record<string, unknown>)
}

export async function publishExportCompleted(
  userId: string,
  projectId: string,
  jobId: string,
  downloadUrl: string,
  expiresAt: string,
): Promise<void> {
  await publishEvent('export.completed', {
    userId,
    projectId,
    jobId,
    downloadUrl,
    expiresAt,
    completedAt: new Date().toISOString(),
  } as Record<string, unknown>)
}
