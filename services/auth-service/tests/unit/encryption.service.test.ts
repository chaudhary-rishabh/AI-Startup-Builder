import { describe, expect, it, vi } from 'vitest'

import { decrypt, encrypt } from '../../src/services/encryption.service.js'

describe('encryption.service', () => {
  it('encrypt returns JSON with iv, data, tag', () => {
    const out = encrypt('hello-world')
    const parsed = JSON.parse(out) as { iv: string; data: string; tag: string }
    expect(typeof parsed.iv).toBe('string')
    expect(typeof parsed.data).toBe('string')
    expect(typeof parsed.tag).toBe('string')
    expect(parsed.iv.length).toBeGreaterThan(0)
  })

  it('decrypt(encrypt(plaintext)) === plaintext', () => {
    const plain = 'secret-totp-material'
    expect(decrypt(encrypt(plain))).toBe(plain)
  })

  it('decrypt with tampered tag throws', () => {
    const out = encrypt('x')
    const parsed = JSON.parse(out) as { iv: string; data: string; tag: string }
    const badTag = parsed.tag.startsWith('0') ? `f${parsed.tag.slice(1)}` : `0${parsed.tag.slice(1)}`
    parsed.tag = badTag
    expect(() => decrypt(JSON.stringify(parsed))).toThrow(/MFA decryption failed/)
  })

  it('decrypt with wrong key throws', async () => {
    const k1 = process.env['MFA_ENCRYPTION_KEY']!
    const k2 = 'abcdef0123456789'.repeat(4)

    vi.resetModules()
    process.env['MFA_ENCRYPTION_KEY'] = k1
    const { encrypt: enc } = await import('../../src/services/encryption.service.js')
    const ct = enc('payload')

    vi.resetModules()
    process.env['MFA_ENCRYPTION_KEY'] = k2
    const { decrypt: dec } = await import('../../src/services/encryption.service.js')
    expect(() => dec(ct)).toThrow(/MFA decryption failed/)

    vi.resetModules()
    process.env['MFA_ENCRYPTION_KEY'] = k1
    await import('../../src/config/env.js')
    await import('../../src/services/encryption.service.js')
  })
})
