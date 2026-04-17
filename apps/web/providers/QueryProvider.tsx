'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import type { PropsWithChildren } from 'react'

import { queryClient } from '@/lib/queryClient'

const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((module) => ({ default: module.ReactQueryDevtools })),
  { ssr: false },
)

export function QueryProvider({ children }: PropsWithChildren): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}
