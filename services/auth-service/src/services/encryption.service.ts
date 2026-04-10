import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import { env } from '../config/env.js'

function keyBuffer(): Buffer {
  const buf = Buffer.from(env.MFA_ENCRYPTION_KEY.toLowerCase(), 'hex')
  if (buf.length !== 32) {
    throw new Error('MFA_ENCRYPTION_KEY must decode to exactly 32 bytes')
  }
  return buf
}

export interface EncryptedPayload {
  iv: string
  data: string
  tag: string
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyBuffer(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload: EncryptedPayload = {
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
    tag: tag.toString('hex'),
  }
  return JSON.stringify(payload)
}

export function decrypt(ciphertext: string): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(ciphertext) as unknown
  } catch {
    throw new Error('MFA decryption failed: ciphertext is not valid JSON')
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('iv' in parsed) ||
    !('data' in parsed) ||
    !('tag' in parsed)
  ) {
    throw new Error('MFA decryption failed: invalid ciphertext structure')
  }
  const rec = parsed as Record<string, unknown>
  const ivHex = rec['iv']
  const dataHex = rec['data']
  const tagHex = rec['tag']
  if (typeof ivHex !== 'string' || typeof dataHex !== 'string' || typeof tagHex !== 'string') {
    throw new Error('MFA decryption failed: invalid ciphertext field types')
  }
  let iv: Buffer
  let data: Buffer
  let tag: Buffer
  try {
    iv = Buffer.from(ivHex, 'hex')
    data = Buffer.from(dataHex, 'hex')
    tag = Buffer.from(tagHex, 'hex')
  } catch {
    throw new Error('MFA decryption failed: invalid hex encoding')
  }
  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error('MFA decryption failed: invalid IV or auth tag length')
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', keyBuffer(), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    throw new Error(`MFA decryption failed: ${msg}`)
  }
}
