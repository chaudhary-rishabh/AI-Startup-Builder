import { jwtVerify, decodeJwt, importSPKI, errors } from 'jose'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/auth/callback']
const ONBOARDING_PATH = '/onboarding'

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Same-origin axios calls must not hit this guard when NEXT_PUBLIC_API_URL is misconfigured
  // (e.g. POST /auth/register would otherwise 307 and break JSON parsing).
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('access_token')?.value
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  try {
    if (process.env.NODE_ENV !== 'production' && token.startsWith('e2e:')) {
      const onboardingDone = token.includes('onboardingDone=true')
      if (!onboardingDone && pathname !== ONBOARDING_PATH && pathname !== '/dashboard') {
        return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url))
      }
      if (onboardingDone && pathname === ONBOARDING_PATH) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', 'e2e-user')
      requestHeaders.set('x-user-role', 'user')
      requestHeaders.set('x-user-plan', 'free')
      return NextResponse.next({ request: { headers: requestHeaders } })
    }

    const publicKeyBase64 = process.env.JWT_PUBLIC_KEY_BASE64 ?? ''
    const pem = atob(publicKeyBase64)
    const publicKey = await importSPKI(pem, 'RS256')
    
    let payload;
    try {
      const result = await jwtVerify(token, publicKey)
      payload = result.payload
    } catch (err: any) {
      // If the signature is valid but only expired, we let it pass.
      // API Gateway will reject API requests and force the Axios interceptor to refresh it.
      if (err instanceof errors.JWTExpired || err?.code === 'ERR_JWT_EXPIRED') {
        payload = decodeJwt(token)
      } else {
        throw err;
      }
    }

    const isOnboardingDone = payload.onboardingDone as boolean | undefined
    // if (!isOnboardingDone && pathname !== ONBOARDING_PATH) {
    //   return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url))
    // }
    if (isOnboardingDone && pathname === ONBOARDING_PATH) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', String(payload.sub ?? ''))
    requestHeaders.set('x-user-role', String(payload.role ?? ''))
    requestHeaders.set('x-user-plan', String(payload.plan ?? ''))

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch (err) {
    console.error('[Middleware Error]', err)
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.delete('access_token')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
