import { and, asc, eq } from 'drizzle-orm'

import { phaseOutputs } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { PhaseOutput } from '../schema.js'

export async function findCurrentPhaseOutput(
  projectId: string,
  phase: number,
): Promise<PhaseOutput | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(phaseOutputs)
    .where(
      and(
        eq(phaseOutputs.projectId, projectId),
        eq(phaseOutputs.phase, phase),
        eq(phaseOutputs.isCurrent, true),
      ),
    )
    .limit(1)
  return row
}

export async function findAllPhaseOutputs(projectId: string): Promise<PhaseOutput[]> {
  const db = getDb()
  return db
    .select()
    .from(phaseOutputs)
    .where(and(eq(phaseOutputs.projectId, projectId), eq(phaseOutputs.isCurrent, true)))
    .orderBy(asc(phaseOutputs.phase))
}

export async function savePhaseOutput(
  projectId: string,
  phase: number,
  outputData: Record<string, unknown>,
  isComplete: boolean,
): Promise<PhaseOutput> {
  const db = getDb()
  const existing = await findCurrentPhaseOutput(projectId, phase)

  if (existing) {
    await db
      .update(phaseOutputs)
      .set({ isCurrent: false, updatedAt: new Date() })
      .where(eq(phaseOutputs.id, existing.id))
  }

  const nextVersion = existing ? existing.version + 1 : 1

  const [row] = await db
    .insert(phaseOutputs)
    .values({
      projectId,
      phase,
      outputData,
      version: nextVersion,
      isCurrent: true,
      isComplete,
    })
    .returning()

  if (!row) throw new Error('savePhaseOutput: insert returned no row')
  return row
}

export async function markPhaseComplete(
  projectId: string,
  phase: number,
): Promise<PhaseOutput | undefined> {
  const db = getDb()
  const [row] = await db
    .update(phaseOutputs)
    .set({ isComplete: true, updatedAt: new Date() })
    .where(
      and(
        eq(phaseOutputs.projectId, projectId),
        eq(phaseOutputs.phase, phase),
        eq(phaseOutputs.isCurrent, true),
      ),
    )
    .returning()
  return row
}

export async function getPhaseCompletionStatus(
  projectId: string,
): Promise<Record<number, boolean>> {
  const db = getDb()
  const rows = await db
    .select({
      phase: phaseOutputs.phase,
      isComplete: phaseOutputs.isComplete,
    })
    .from(phaseOutputs)
    .where(and(eq(phaseOutputs.projectId, projectId), eq(phaseOutputs.isCurrent, true)))

  const map: Record<number, boolean> = {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  }
  for (const r of rows) {
    map[r.phase] = r.isComplete
  }
  return map
}
