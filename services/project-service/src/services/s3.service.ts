import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { env } from '../config/env.js'

const s3Client = new S3Client({ region: env.AWS_REGION })

export async function uploadExportToS3(
  s3Key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET_EXPORTS,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    }),
  )
}

export async function generateDownloadUrl(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET_EXPORTS,
    Key: s3Key,
  })
  return getSignedUrl(s3Client, command, { expiresIn: 3600 })
}
