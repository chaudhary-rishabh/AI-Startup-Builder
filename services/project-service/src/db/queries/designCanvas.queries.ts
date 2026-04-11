import { eq } from 'drizzle-orm'

import { designCanvas } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { DesignCanvas, NewDesignCanvas } from '../schema.js'

export async function findCanvasByProjectId(projectId: string): Promise<DesignCanvas | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(designCanvas)
    .where(eq(designCanvas.projectId, projectId))
    .limit(1)
  return row
}

/** @deprecated Use findCanvasByProjectId — kept for older imports. */
export const findDesignCanvasByProjectId = findCanvasByProjectId

export async function createCanvas(projectId: string): Promise<DesignCanvas> {
  const db = getDb()
  const [row] = await db
    .insert(designCanvas)
    .values({
      projectId,
      canvasData: [],
      pages: [],
      designTokens: {},
      viewport: { x: 0, y: 0, zoom: 1 },
    })
    .returning()
  if (!row) throw new Error('createCanvas: insert returned no row')
  return row
}

export type CanvasUpsertPatch = {
  canvasData?: unknown[]
  pages?: unknown[]
  designTokens?: Record<string, unknown>
  viewport?: { x: number; y: number; zoom: number }
}

export async function upsertCanvas(projectId: string, data: CanvasUpsertPatch): Promise<DesignCanvas> {
  const db = getDb()
  const existing = await findCanvasByProjectId(projectId)

  if (!existing) {
    const [row] = await db
      .insert(designCanvas)
      .values({
        projectId,
        canvasData: (data.canvasData ?? []) as NewDesignCanvas['canvasData'],
        pages: (data.pages ?? []) as NewDesignCanvas['pages'],
        designTokens: (data.designTokens ?? {}) as NewDesignCanvas['designTokens'],
        viewport: (data.viewport ?? { x: 0, y: 0, zoom: 1 }) as NewDesignCanvas['viewport'],
      })
      .returning()
    if (!row) throw new Error('upsertCanvas: insert returned no row')
    return row
  }

  const next = {
    canvasData:
      data.canvasData !== undefined
        ? data.canvasData
        : (existing.canvasData as unknown[]),
    pages: data.pages !== undefined ? data.pages : (existing.pages as unknown[]),
    designTokens:
      data.designTokens !== undefined
        ? data.designTokens
        : (existing.designTokens as Record<string, unknown>),
    viewport:
      data.viewport !== undefined
        ? data.viewport
        : (existing.viewport as { x: number; y: number; zoom: number }),
  }

  const [row] = await db
    .update(designCanvas)
    .set({
      canvasData: next.canvasData as never,
      pages: next.pages as never,
      designTokens: next.designTokens as never,
      viewport: next.viewport as never,
      updatedAt: new Date(),
    })
    .where(eq(designCanvas.projectId, projectId))
    .returning()
  if (!row) throw new Error('upsertCanvas: update returned no row')
  return row
}

export async function deleteCanvas(projectId: string): Promise<void> {
  const db = getDb()
  await db.delete(designCanvas).where(eq(designCanvas.projectId, projectId))
}
