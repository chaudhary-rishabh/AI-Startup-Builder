import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { env } from '../config/env.js'

const s3Client = new S3Client({ region: env.AWS_REGION })

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])

export function buildAvatarCdnUrl(s3Key: string): string {
  return `https://${env.AWS_S3_BUCKET_UPLOADS}.s3.${env.AWS_REGION}.amazonaws.com/${s3Key}`
}

export function extractS3KeyFromUploadsUrl(avatarUrl: string): string | null {
  const prefix = `https://${env.AWS_S3_BUCKET_UPLOADS}.s3.${env.AWS_REGION}.amazonaws.com/`
  if (!avatarUrl.startsWith(prefix)) return null
  return avatarUrl.slice(prefix.length)
}

export async function generateAvatarUploadUrl(
  userId: string,
  fileExtension: string,
): Promise<{ uploadUrl: string; s3Key: string; cdnUrl: string }> {
  const ext = fileExtension.toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error('Invalid file type')
  }
  const s3Key = `avatars/${userId}/${Date.now()}.${ext}`
  const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET_UPLOADS,
    Key: s3Key,
    ContentType: contentType,
    ContentLength: 5 * 1024 * 1024,
    Metadata: { userId },
  })
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })
  const cdnUrl = buildAvatarCdnUrl(s3Key)
  return { uploadUrl, s3Key, cdnUrl }
}

export async function deleteAvatar(s3Key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET_UPLOADS,
      Key: s3Key,
    }),
  )
}
