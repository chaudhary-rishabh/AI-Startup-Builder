import { SignJWT, importPKCS8 } from 'jose'

let cachedKey: CryptoKey | null = null

async function getPrivateKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  const b64 = process.env['JWT_PRIVATE_KEY_TEST_BASE64']
  if (!b64) throw new Error('JWT_PRIVATE_KEY_TEST_BASE64 missing')
  const pem = Buffer.from(b64, 'base64').toString('utf-8')
  cachedKey = await importPKCS8(pem, 'RS256')
  return cachedKey
}

export async function signTestAccessToken(opts: {
  userId: string
  plan?: string
  role?: string
  email?: string
  name?: string
}): Promise<string> {
  const key = await getPrivateKey()
  return new SignJWT({
    type: 'access',
    role: opts.role ?? 'user',
    plan: opts.plan ?? 'free',
    email: opts.email ?? 'user@test.local',
    name: opts.name ?? 'Test User',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer('ai-startup-builder')
    .setAudience('ai-startup-builder-api')
    .setSubject(opts.userId)
    .setExpirationTime('2h')
    .sign(key)
}
