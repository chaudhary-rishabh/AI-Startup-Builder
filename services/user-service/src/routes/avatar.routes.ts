import { createHash } from 'node:crypto'

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { publishUserProfileUpdated } from '../events/publisher.js'
import { err, ok } from '../lib/response.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { getAuthUser, updateAuthUserAvatar } from '../services/authClient.service.js'
import {
  buildAvatarCdnUrl,
  deleteAvatar,
  extractS3KeyFromUploadsUrl,
  generateAvatarUploadUrl,
} from '../services/s3.service.js'

const AvatarExtensionSchema = z.object({
  fileExtension: z.string().min(1).max(12),
})

const AvatarConfirmSchema = z.object({
  s3Key: z.string().min(1),
})

function gravatarUrlForEmail(email: string): string {
  const hash = createHash('md5').update(email.trim().toLowerCase()).digest('hex')
  return `https://www.gravatar.com/avatar/${hash}?d=mp`
}

function isGravatarUrl(url: string): boolean {
  return url.includes('gravatar.com/avatar/')
}

const avatarRoutes = new Hono()

avatarRoutes.post(
  '/me/avatar',
  requireAuth,
  zValidator('json', AvatarExtensionSchema, (r) => {
    if (!r.success) throw r.error
  }),
  async (c) => {
    const userId = c.get('userId' as never) as string
    const { fileExtension } = c.req.valid('json')
    let result: { uploadUrl: string; s3Key: string; cdnUrl: string }
    try {
      result = await generateAvatarUploadUrl(userId, fileExtension.toLowerCase())
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'Invalid file type') {
        return err(c, 415, 'INVALID_FILE_TYPE', 'Invalid file type')
      }
      throw e
    }
    return ok(c, {
      uploadUrl: result.uploadUrl,
      s3Key: result.s3Key,
      expiresIn: 300,
      instructions:
        'PUT the file binary to uploadUrl, then confirm via PATCH /users/me/avatar/confirm',
    })
  },
)

avatarRoutes.patch(
  '/me/avatar/confirm',
  requireAuth,
  zValidator('json', AvatarConfirmSchema, (r) => {
    if (!r.success) throw r.error
  }),
  async (c) => {
    const userId = c.get('userId' as never) as string
    const requestId = c.get('requestId' as never) as string | undefined
    const { s3Key } = c.req.valid('json')
    const expectedPrefix = `avatars/${userId}/`
    if (!s3Key.startsWith(expectedPrefix)) {
      return err(c, 403, 'FORBIDDEN', 'Invalid avatar object key')
    }

    const cdnUrl = buildAvatarCdnUrl(s3Key)

    const authBefore = await getAuthUser(userId, requestId)
    if (!authBefore) {
      return err(c, 404, 'USER_NOT_FOUND', 'User not found')
    }

    const oldS3Key =
      authBefore.avatarUrl !== null ? extractS3KeyFromUploadsUrl(authBefore.avatarUrl) : null

    await updateAuthUserAvatar(userId, cdnUrl, requestId)

    if (oldS3Key && !isGravatarUrl(authBefore.avatarUrl ?? '')) {
      try {
        await deleteAvatar(oldS3Key)
      } catch (e) {
        console.error('[user-service] Failed to delete old avatar object:', e)
      }
    }

    try {
      await publishUserProfileUpdated(userId, ['avatarUrl'])
    } catch (e) {
      console.error('[user-service] Failed to publish profile update:', e)
    }

    return ok(c, { avatarUrl: cdnUrl })
  },
)

avatarRoutes.delete('/me/avatar', requireAuth, async (c) => {
  const userId = c.get('userId' as never) as string
  const requestId = c.get('requestId' as never) as string | undefined

  const auth = await getAuthUser(userId, requestId)
  if (!auth) {
    return err(c, 404, 'USER_NOT_FOUND', 'User not found')
  }

  const url = auth.avatarUrl
  if (url === null || isGravatarUrl(url)) {
    return err(c, 404, 'NO_CUSTOM_AVATAR', 'No custom avatar to delete')
  }

  const s3Key = extractS3KeyFromUploadsUrl(url)
  if (!s3Key) {
    return err(c, 404, 'NO_CUSTOM_AVATAR', 'No custom avatar to delete')
  }

  try {
    await deleteAvatar(s3Key)
  } catch (e) {
    console.error('[user-service] Failed to delete avatar object:', e)
  }

  await updateAuthUserAvatar(userId, null, requestId)

  const fallback = gravatarUrlForEmail(auth.email)
  return ok(c, { message: 'Avatar removed', avatarUrl: fallback })
})

export default avatarRoutes
