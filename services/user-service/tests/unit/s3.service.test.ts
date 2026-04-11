import { beforeEach, describe, expect, it, vi } from 'vitest'

const putInstances: unknown[] = []
const deleteInstances: unknown[] = []
const sendMock = vi.fn()

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: sendMock })),
  PutObjectCommand: vi.fn(function (this: unknown, input: unknown) {
    putInstances.push(input)
    return { _type: 'Put', input }
  }),
  DeleteObjectCommand: vi.fn(function (this: unknown, input: unknown) {
    deleteInstances.push(input)
    return { _type: 'Delete', input }
  }),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(() => Promise.resolve('https://signed.example/presigned-put')),
}))

const TEST_BUCKET = 'unit-test-s3-bucket'

describe('s3.service', () => {
  beforeEach(() => {
    process.env['AWS_S3_BUCKET_UPLOADS'] = TEST_BUCKET
    vi.resetModules()
    putInstances.length = 0
    deleteInstances.length = 0
    sendMock.mockReset()
    sendMock.mockResolvedValue({})
  })

  it('generateAvatarUploadUrl returns uploadUrl and s3Key pattern', async () => {
    const mod = await import('../../src/services/s3.service.js')
    const uid = '550e8400-e29b-41d4-a716-446655440000'
    const r = await mod.generateAvatarUploadUrl(uid, 'png')
    expect(r.uploadUrl).toBe('https://signed.example/presigned-put')
    expect(r.s3Key).toMatch(new RegExp(`^avatars/${uid}/\\d+\\.png$`))
    expect(r.cdnUrl).toContain(`${TEST_BUCKET}.s3.us-east-1.amazonaws.com/`)
    expect(r.cdnUrl).toContain(r.s3Key)
    const put = putInstances[0] as {
      Bucket: string
      Key: string
      ContentType: string
      ContentLength: number
      Metadata: { userId: string }
    }
    expect(put.Bucket).toBe(TEST_BUCKET)
    expect(put.Metadata.userId).toBe(uid)
    expect(put.ContentLength).toBe(5 * 1024 * 1024)
  })

  it('generateAvatarUploadUrl throws on invalid extension', async () => {
    const mod = await import('../../src/services/s3.service.js')
    await expect(mod.generateAvatarUploadUrl('u1', 'gif')).rejects.toThrow('Invalid file type')
    await expect(mod.generateAvatarUploadUrl('u1', 'svg')).rejects.toThrow('Invalid file type')
    await expect(mod.generateAvatarUploadUrl('u1', 'pdf')).rejects.toThrow('Invalid file type')
  })

  it('generateAvatarUploadUrl s3Key includes userId', async () => {
    const mod = await import('../../src/services/s3.service.js')
    const uid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const r = await mod.generateAvatarUploadUrl(uid, 'jpg')
    expect(r.s3Key.startsWith(`avatars/${uid}/`)).toBe(true)
    const put = putInstances[0] as { ContentType: string }
    expect(put.ContentType).toBe('image/jpeg')
  })

  it('deleteAvatar sends DeleteObjectCommand with key', async () => {
    const mod = await import('../../src/services/s3.service.js')
    await mod.deleteAvatar('avatars/u1/123.webp')
    expect(sendMock).toHaveBeenCalled()
    const del = deleteInstances[0] as { Bucket: string; Key: string }
    expect(del.Key).toBe('avatars/u1/123.webp')
    expect(del.Bucket).toBe(TEST_BUCKET)
  })
})
