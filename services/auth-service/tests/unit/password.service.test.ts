import { describe, expect, it } from 'vitest'

import {
  comparePassword,
  generateSecureToken,
  hashPassword,
  hashToken,
  isStrongPassword,
} from '../../src/services/password.service.js'

describe('password.service', () => {
  it('hashPassword returns bcrypt hash', async () => {
    const hash = await hashPassword('Test123!')
    expect(hash.startsWith('$2b$') || hash.startsWith('$2a$')).toBe(true)
  })

  it('comparePassword returns true for correct password', async () => {
    const hash = await hashPassword('Secret1!')
    await expect(comparePassword('Secret1!', hash)).resolves.toBe(true)
  })

  it('comparePassword returns false for wrong password', async () => {
    const hash = await hashPassword('Secret1!')
    await expect(comparePassword('Other1!', hash)).resolves.toBe(false)
  })

  it('generateSecureToken returns hex of default byte length', () => {
    const t = generateSecureToken()
    expect(t).toMatch(/^[0-9a-f]+$/)
    expect(t.length).toBe(64)
  })

  it('hashToken is deterministic', () => {
    expect(hashToken('same')).toBe(hashToken('same'))
    expect(hashToken('a')).not.toBe(hashToken('b'))
  })

  it('isStrongPassword rejects weak and accepts strong passwords', () => {
    expect(isStrongPassword('short')).toBe(false)
    expect(isStrongPassword('noupper1!')).toBe(false)
    expect(isStrongPassword('NoDigit!')).toBe(false)
    expect(isStrongPassword('NoSpecial1')).toBe(false)
    expect(isStrongPassword('Good1!pass')).toBe(true)
  })
})
