import { z } from 'zod'

import { deleteCanvas } from '../../db/queries/designCanvas.queries.js'
import { deleteAllFilesByProject } from '../../db/queries/projectFiles.queries.js'
import { findProjectsByUserId, softDeleteProject } from '../../db/queries/projects.queries.js'

const userDeletedPayloadSchema = z.object({
  userId: z.string().uuid(),
})

export async function handleUserDeleted(payload: unknown): Promise<void> {
  const parsed = userDeletedPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    console.warn('[project-service] user.deleted: invalid payload', parsed.error.flatten())
    return
  }

  const { userId } = parsed.data
  const { data: projectList } = await findProjectsByUserId(userId, {
    status: 'all',
    page: 1,
    limit: 1000,
  })

  let projectsDeleted = 0
  for (const project of projectList) {
    await softDeleteProject(project.id, userId)
    await deleteCanvas(project.id)
    await deleteAllFilesByProject(project.id)
    projectsDeleted += 1
  }

  console.info(
    JSON.stringify({
      event: 'user.deleted handled in project-service',
      userId,
      projectsDeleted,
    }),
  )
}
