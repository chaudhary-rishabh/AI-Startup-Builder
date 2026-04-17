import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<JSX.Element> {
  const headerStore = await headers()
  const cookieStore = await cookies()
  const pathname = headerStore.get('next-url') ?? ''
  const accessToken = cookieStore.get('access_token')?.value

  if (accessToken && pathname === '/') {
    redirect('/dashboard')
  }

  return <main className="min-h-screen bg-bg">{children}</main>
}
