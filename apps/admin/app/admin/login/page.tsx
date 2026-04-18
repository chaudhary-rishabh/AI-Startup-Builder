import { Suspense } from 'react'
import { AdminLoginContent } from './AdminLoginContent'

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: '#5C4425' }}
        />
      }
    >
      <AdminLoginContent />
    </Suspense>
  )
}
