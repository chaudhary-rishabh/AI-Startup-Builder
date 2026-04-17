import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export function Button({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
  return <button className={cn('rounded-md px-3 py-2', className)} {...props} />
}
