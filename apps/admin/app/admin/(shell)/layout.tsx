'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AdminHeader } from '@/components/layout/AdminHeader'

const persistApi = useAdminAuthStore.persist

export default function AdminShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAdminAuthStore()
  const router = useRouter()
  const [hasHydrated, setHasHydrated] = useState(() =>
    typeof window === 'undefined' ? false : persistApi.hasHydrated(),
  )

  useEffect(() => {
    if (persistApi.hasHydrated()) {
      setHasHydrated(true)
      return
    }
    const unsub = persistApi.onFinishHydration(() => setHasHydrated(true))
    return unsub
  }, [])

  useEffect(() => {
    if (!hasHydrated || isLoading) return
    if (!isAuthenticated) {
      router.replace('/admin/login')
    }
  }, [hasHydrated, isAuthenticated, isLoading, router])

  if (!hasHydrated || isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
