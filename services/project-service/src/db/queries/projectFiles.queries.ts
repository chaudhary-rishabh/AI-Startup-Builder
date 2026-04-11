import { and, eq } from 'drizzle-orm'

import { projectFiles } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { NewProjectFile, ProjectFile } from '../schema.js'

export async function listProjectFilesByProjectId(projectId: string): Promise<ProjectFile[]> {
  const db = getDb()
  return db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId))
}

export async function upsertProjectFile(data: NewProjectFile): Promise<ProjectFile> {
  const db = getDb()
  const [row] = await db
    .insert(projectFiles)
    .values(data)
    .onConflictDoUpdate({
      target: [projectFiles.projectId, projectFiles.path],
      set: {
        content: data.content,
        language: data.language ?? null,
        agentType: data.agentType ?? null,
        isModified: data.isModified ?? false,
        updatedAt: new Date(),
      },
    })
    .returning()
  if (!row) throw new Error('upsertProjectFile: no row returned')
  return row
}

export async function deleteProjectFilesByProjectId(projectId: string): Promise<void> {
  const db = getDb()
  await db.delete(projectFiles).where(eq(projectFiles.projectId, projectId))
}

export async function findProjectFileByPath(
  projectId: string,
  path: string,
): Promise<ProjectFile | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(projectFiles)
    .where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, path)))
    .limit(1)
  return row
}
