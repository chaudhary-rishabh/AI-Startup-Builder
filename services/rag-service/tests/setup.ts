import './env-setup.js'

import Redis from 'ioredis-mock'
import { vi } from 'vitest'

import { setRedisForTests } from '../src/lib/redis.js'

setRedisForTests(new Redis() as never)

vi.mock('@aws-sdk/client-s3', () => {
  const buf = { async transformToByteArray() {
    return new Uint8Array()
  } }
  return {
    S3Client: vi.fn().mockImplementation(() => ({
      send: vi.fn().mockImplementation((cmd: { constructor: { name: string } }) => {
        if (cmd.constructor.name === 'GetObjectCommand') {
          return Promise.resolve({ Body: buf })
        }
        if (cmd.constructor.name === 'ListObjectsV2Command') {
          return Promise.resolve({ Contents: [], IsTruncated: false })
        }
        return Promise.resolve({})
      }),
    })),
    GetObjectCommand: vi.fn(),
    PutObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
    ListObjectsV2Command: vi.fn(),
    DeleteObjectsCommand: vi.fn(),
  }
})

const mockEmbeddingVector = new Array(768).fill(0.01)

vi.mock('@google/generative-ai', () => {
  const makeModel = () => ({
    embedContent: vi.fn().mockResolvedValue({
      embedding: { values: [...mockEmbeddingVector] },
    }),
    generateContent: vi.fn().mockResolvedValue({
      response: { text: () => 'context prefix' },
    }),
  })
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockImplementation(() => makeModel()),
    })),
  }
})

const mockNamespace = vi.fn().mockReturnValue({
  upsert: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue({ matches: [] }),
  deleteMany: vi.fn().mockResolvedValue(undefined),
  deleteAll: vi.fn().mockResolvedValue(undefined),
})

vi.mock('@pinecone-database/pinecone', () => {
  return {
    Pinecone: vi.fn().mockImplementation(() => ({
      index: vi.fn().mockReturnValue({
        namespace: mockNamespace,
        describeIndexStats: vi.fn().mockResolvedValue({
          dimension: 768,
          namespaces: { test: { recordCount: 0 } },
        }),
      }),
    })),
  }
})

export { mockNamespace }
