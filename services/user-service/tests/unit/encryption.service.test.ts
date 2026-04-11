import { describe, expect, it } from 'vitest'

import { decrypt, encrypt } from '../../src/services/encryption.service.js'

describe('encryption.service', () => {
  it('encrypt + decrypt round-trip', () => {
    const plain = 'oauth-access-token-value'
    const enc = encrypt(plain)
    expect(decrypt(enc)).toBe(plain)
  })

  it('ciphertext differs from plaintext', () => {
    const plain = 'secret'
    const enc = encrypt(plain)
    expect(enc).not.toBe(plain)
    expect(enc.includes(plain)).toBe(false)
  })

  it('decrypt with tampered data throws', () => {
    const enc = encrypt('hello')
    const parsed = JSON.parse(enc) as { iv: string; data: string; tag: string }
    parsed.data = 'deadbeef'
    expect(() => decrypt(JSON.stringify(parsed))).toThrow()
  })

  it('two encryptions of same plaintext differ (random IV)', () => {
    const plain = 'same'
    const a = encrypt(plain)
    const b = encrypt(plain)
    expect(a).not.toBe(b)
    expect(decrypt(a)).toBe(plain)
    expect(decrypt(b)).toBe(plain)
  })
})
