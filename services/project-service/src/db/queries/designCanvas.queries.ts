import { eq } from 'drizzle-orm'

import { designCanvas } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { DesignCanvas, NewDesignCanvas } from '../schema.js'

export async function findDesignCanvasByProjectId(
  projectId: string,
): Promise<DesignCanvas | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(designCanvas)
    .where(eq(designCanvas.projectId, projectId))
    .limit(1)
  return row
}

export async function upsertDesignCanvasForProject(
  projectId: string,
  patch: Partial<Omit<NewDesignCanvas, 'projectId'>>,
): Promise<DesignCanvas> {
  const db = getDb()
  const existing = await findDesignCanvasByProjectId(projectId)
  if (existing) {
    const [row] = await db
      .update(designCanvas)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(eq(designCanvas.projectId, projectId))
      .returning()
    if (!row) throw new Error('upsertDesignCanvasForProject: update returned no row')
    return row
  }
  const [row] = await db
    .insert(designCanvas)
    .values({
      projectId,
      canvasData: patch.canvasData ?? [],
      pages: patch.pages ?? [],
      designTokens: patch.designTokens ?? {},
      viewport: patch.viewport ?? { x: 0, y: 0, zoom: 1 },
    })
    .returning()
  if (!row) throw new Error('upsertDesignCanvasForProject: insert returned no row')
  return row
}
