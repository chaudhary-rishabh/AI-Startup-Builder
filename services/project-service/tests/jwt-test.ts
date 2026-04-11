import { SignJWT } from 'jose'
import { importPKCS8 } from 'jose'

const privateKeyPem = Buffer.from(process.env['JWT_PRIVATE_KEY_TEST_BASE64']!, 'base64').toString(
  'utf-8',
)
const privateKey = await importPKCS8(privateKeyPem, 'RS256')

export async function signTestAccessToken(payload: {
  sub: string
  role?: string
  plan?: string
  email?: string
}): Promise<string> {
  return new SignJWT({
    sub: payload.sub,
    role: payload.role ?? 'user',
    plan: payload.plan ?? 'free',
    email: payload.email ?? 'test@example.com',
    type: 'access',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer('ai-startup-builder')
    .setAudience('ai-startup-builder-api')
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(privateKey)
}
