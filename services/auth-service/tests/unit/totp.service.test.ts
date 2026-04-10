import { authenticator } from 'otplib'
import { describe, expect, it } from 'vitest'

import {
  generateBackupCodes,
  generateTotpSecret,
  verifyBackupCode,
  verifyTotpCode,
} from '../../src/services/totp.service.js'

describe('totp.service', () => {
  it('generateTotpSecret returns secret, URL, and QR data URL', async () => {
    const out = await generateTotpSecret('user@example.com')
    expect(out.secret.length).toBeGreaterThan(10)
    expect(out.otpAuthUrl).toContain('otpauth://')
    expect(out.otpAuthUrl).toContain(encodeURIComponent('user@example.com'))
    expect(out.qrCodeDataUrl.startsWith('data:image/png;base64,')).toBe(true)
  })

  it('verifyTotpCode returns true for correct code', () => {
    const secret = authenticator.generateSecret()
    const token = authenticator.generate(secret)
    expect(verifyTotpCode(secret, token)).toBe(true)
  })

  it('verifyTotpCode returns false for wrong code', () => {
    const secret = authenticator.generateSecret()
    expect(verifyTotpCode(secret, '000000')).toBe(false)
  })

  it('generateBackupCodes returns 8 codes', () => {
    const { plaintext, hashed } = generateBackupCodes(8)
    expect(plaintext).toHaveLength(8)
    expect(hashed).toHaveLength(8)
    for (const p of plaintext) {
      expect(p).toMatch(/^[0-9a-f]{10}$/)
    }
  })

  it('verifyBackupCode returns true and removes used code', () => {
    const { plaintext, hashed } = generateBackupCodes(3)
    const res = verifyBackupCode(hashed, plaintext[1]!)
    expect(res.valid).toBe(true)
    expect(res.remainingCodes).toHaveLength(2)
    expect(res.remainingCodes.includes(hashed[1]!)).toBe(false)
  })

  it('verifyBackupCode returns false for invalid code', () => {
    const { hashed } = generateBackupCodes(2)
    const res = verifyBackupCode(hashed, 'ffffffffff')
    expect(res.valid).toBe(false)
    expect(res.remainingCodes).toEqual(hashed)
  })
})
