'use client'

import type { PropsWithChildren } from 'react'

export function ThemeProvider({ children }: PropsWithChildren): JSX.Element {
  return <>{children}</>
}
