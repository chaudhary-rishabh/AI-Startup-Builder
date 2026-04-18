import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify, importSPKI } from 'jose'

const PUBLIC_PATHS = ['/admin/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('admin_token')?.value

  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  try {
    if (process.env.NODE_ENV !== 'production' && token.startsWith('mock.')) {
      const headers = new Headers(request.headers)
      headers.set('x-admin-id', 'admin-1')
      headers.set('x-admin-role', 'super_admin')
      headers.set('x-admin-email', 'admin@example.com')
      return NextResponse.next({ request: { headers } })
    }

    const keyRaw = process.env.JWT_PUBLIC_KEY
    if (!keyRaw) {
      throw new Error('JWT_PUBLIC_KEY is not set')
    }
    const publicKey = await importSPKI(keyRaw.replace(/\\n/g, '\n'), 'RS256')
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ['RS256'],
    })

    const role = payload['role'] as string
    if (role !== 'admin' && role !== 'super_admin') {
      throw new Error('Insufficient role')
    }

    const headers = new Headers(request.headers)
    headers.set('x-admin-id', payload['sub'] as string)
    headers.set('x-admin-role', role)
    headers.set('x-admin-email', (payload['email'] as string) ?? '')

    return NextResponse.next({ request: { headers } })
  } catch {
    const response = NextResponse.redirect(
      new URL('/admin/login?expired=1', request.url),
    )
    response.cookies.delete('admin_token')
    return response
  }
}

export const config = {
  matcher: ['/admin/:path*'],
}
