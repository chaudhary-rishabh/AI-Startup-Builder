'use client'

import type { PropsWithChildren } from 'react'

export function ErrorBoundary({ children }: PropsWithChildren): JSX.Element {
  return <>{children}</>
}
