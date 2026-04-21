'use client'

import { ShellLayout } from '@/components/layout/ShellLayout'

export default function AppLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      <ShellLayout>{children}</ShellLayout>
    </div>
  )
}
