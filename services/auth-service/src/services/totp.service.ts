import { createHash, randomBytes } from 'node:crypto'

import { authenticator } from 'otplib'
import QRCode from 'qrcode'

authenticator.options = { window: 1 }

export async function generateTotpSecret(userEmail: string): Promise<{
  secret: string
  otpAuthUrl: string
  qrCodeDataUrl: string
}> {
  const secret = authenticator.generateSecret()
  const otpAuthUrl = authenticator.keyuri(userEmail, 'AI Startup Builder', secret)
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl)
  return { secret, otpAuthUrl, qrCodeDataUrl }
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return authenticator.check(code, secret)
}

export function generateBackupCodes(count = 8): { plaintext: string[]; hashed: string[] } {
  const plaintext: string[] = []
  const hashed: string[] = []
  for (let i = 0; i < count; i += 1) {
    const code = randomBytes(5).toString('hex')
    plaintext.push(code)
    hashed.push(createHash('sha256').update(code, 'utf8').digest('hex'))
  }
  return { plaintext, hashed }
}

export function verifyBackupCode(
  storedHashedCodes: string[],
  inputCode: string,
): { valid: boolean; remainingCodes: string[] } {
  const inputHash = createHash('sha256').update(inputCode.trim(), 'utf8').digest('hex')
  const idx = storedHashedCodes.findIndex((h) => h === inputHash)
  if (idx === -1) {
    return { valid: false, remainingCodes: storedHashedCodes }
  }
  const remainingCodes = storedHashedCodes.filter((_, i) => i !== idx)
  return { valid: true, remainingCodes }
}
