'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): JSX.Element {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error)
    }
    // In production, send this error to OTel structured logs.
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="max-w-md rounded-card border border-divider bg-card p-6 text-center shadow-card">
        <h1 className="font-display text-[20px] font-bold text-heading">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">An unexpected issue occurred while loading this page.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
