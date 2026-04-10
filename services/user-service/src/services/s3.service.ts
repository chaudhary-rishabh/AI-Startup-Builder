import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { env } from '../config/env.js'

let _s3: S3Client | undefined

export function getS3Client(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({ region: env.AWS_REGION })
  }
  return _s3
}

/**
 * Presigned PUT for future avatar / asset uploads (P11). Not wired to routes yet.
 */
export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  const client = getS3Client()
  const cmd = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET_UPLOADS,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(client, cmd, { expiresIn: 3600 })
}
