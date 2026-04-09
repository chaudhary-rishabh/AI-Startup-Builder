import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'node:crypto'

import { env } from '../config/env.js'

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, env.BCRYPT_ROUNDS)
}

export async function comparePassword(plaintext: string, hash: string): Promise<boolean> {
  if (!hash) return false
  return bcrypt.compare(plaintext, hash)
}

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

/**
 * Matches `RegisterSchema` / `ResetPasswordSchema` password rules in @repo/validators.
 */
export function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[0-9]/.test(password)) return false
  if (!/[^A-Za-z0-9]/.test(password)) return false
  return true
}
