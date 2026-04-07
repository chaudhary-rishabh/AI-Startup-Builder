import * as React from 'react'

import { cn } from '../../lib/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-card border border-divider bg-white px-3 py-2 text-sm text-slate-800',
          'placeholder:text-brand-light',
          'focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-0 focus:border-brand',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors duration-200',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
