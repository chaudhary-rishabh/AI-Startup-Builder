import { and, asc, eq } from 'drizzle-orm'

import { projectFiles } from '../schema.js'
import { getDb } from '../../lib/db.js'

import type { NewProjectFile, ProjectFile } from '../schema.js'

export type FileTreeNode = {
  name: string
  type: 'file' | 'dir'
  path?: string
  id?: string
  language?: string
  agentType?: string
  isModified?: boolean
  children?: FileTreeNode[]
}

export async function findFilesByProject(
  projectId: string,
  agentType?: string,
): Promise<ProjectFile[]> {
  const db = getDb()
  const projectCond = eq(projectFiles.projectId, projectId)
  const whereCond =
    agentType === undefined ? projectCond : and(projectCond, eq(projectFiles.agentType, agentType))
  return db.select().from(projectFiles).where(whereCond).orderBy(asc(projectFiles.path))
}

export async function findFileById(
  id: string,
  projectId: string,
): Promise<ProjectFile | undefined> {
  const db = getDb()
  const [row] = await db
    .select()
    .from(projectFiles)
    .where(and(eq(projectFiles.id, id), eq(projectFiles.projectId, projectId)))
    .limit(1)
  return row
}

export async function findFileByPath(
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

export async function upsertFile(data: NewProjectFile): Promise<ProjectFile> {
  const db = getDb()
  const [row] = await db
    .insert(projectFiles)
    .values({
      ...data,
      isModified: data.isModified ?? false,
    })
    .onConflictDoUpdate({
      target: [projectFiles.projectId, projectFiles.path],
      set: {
        content: data.content,
        language: data.language ?? null,
        agentType: data.agentType ?? null,
        isModified: false,
        updatedAt: new Date(),
      },
    })
    .returning()
  if (!row) throw new Error('upsertFile: no row returned')
  return row
}

export async function updateFile(
  id: string,
  projectId: string,
  patch: { content: string },
): Promise<ProjectFile | undefined> {
  const db = getDb()
  const [row] = await db
    .update(projectFiles)
    .set({
      content: patch.content,
      isModified: true,
      updatedAt: new Date(),
    })
    .where(and(eq(projectFiles.id, id), eq(projectFiles.projectId, projectId)))
    .returning()
  return row
}

export async function deleteFile(id: string, projectId: string): Promise<boolean> {
  const db = getDb()
  const deleted = await db
    .delete(projectFiles)
    .where(and(eq(projectFiles.id, id), eq(projectFiles.projectId, projectId)))
    .returning({ id: projectFiles.id })
  return deleted.length > 0
}

export async function deleteAllFilesByProject(projectId: string): Promise<void> {
  const db = getDb()
  await db.delete(projectFiles).where(eq(projectFiles.projectId, projectId))
}

function sortTreeNodes(nodes: FileTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  for (const n of nodes) {
    if (n.children?.length) sortTreeNodes(n.children)
  }
}

/**
 * Groups flat file paths into a directory tree. Directories appear before files; names sorted.
 */
export function buildFileTree(files: ProjectFile[]): FileTreeNode[] {
  const rootChildren: FileTreeNode[] = []

  for (const f of files) {
    const segments = f.path.replace(/^\/+/, '').split('/').filter(Boolean)
    if (segments.length === 0) continue

    let level = rootChildren
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!
      const isFile = i === segments.length - 1
      if (isFile) {
        const fileNode: FileTreeNode = {
          name: seg,
          type: 'file',
          path: f.path,
          id: f.id,
          isModified: f.isModified,
        }
        if (f.language != null) fileNode.language = f.language
        if (f.agentType != null) fileNode.agentType = f.agentType
        level.push(fileNode)
        break
      }
      let dir = level.find((n) => n.name === seg && n.type === 'dir')
      if (!dir) {
        dir = { name: seg, type: 'dir', children: [] }
        level.push(dir)
      }
      if (!dir.children) dir.children = []
      level = dir.children
    }
  }

  sortTreeNodes(rootChildren)
  return rootChildren
}

/** @deprecated Use findFilesByProject */
export const listProjectFilesByProjectId = (projectId: string) => findFilesByProject(projectId)

/** @deprecated Use upsertFile */
export const upsertProjectFile = upsertFile

/** @deprecated Use deleteAllFilesByProject */
export const deleteProjectFilesByProjectId = deleteAllFilesByProject

/** @deprecated Use findFileByPath */
export const findProjectFileByPath = findFileByPath
