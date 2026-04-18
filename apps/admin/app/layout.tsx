import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers/Providers'

export const metadata: Metadata = {
  title: 'Admin — AI Startup Builder',
  description: 'Platform administration panel',
  robots: 'noindex, nofollow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-body bg-bg text-heading antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
