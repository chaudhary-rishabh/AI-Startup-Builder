import { cva } from 'class-variance-authority'

/**
 * Button variants — design system primary/outline/ghost/destructive.
 * Import this in button.tsx AND anywhere a button-like element needs CVA.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-card text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-brand text-white hover:bg-brand-dark',
        destructive:
          'bg-red-600 text-white hover:bg-red-700',
        outline:
          'border border-brand bg-transparent text-brand hover:bg-background',
        secondary:
          'bg-sidebar text-brand-dark hover:bg-divider',
        ghost:
          'hover:bg-background text-brand-dark',
        link:
          'text-brand underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-chip px-3 text-xs',
        lg: 'h-11 rounded-card px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

/** Badge variants */
export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand text-white',
        secondary: 'border-transparent bg-sidebar text-brand-dark',
        destructive: 'border-transparent bg-red-600 text-white',
        outline: 'border-brand text-brand-dark',
        success: 'border-transparent bg-green-100 text-green-800',
        warning: 'border-transparent bg-amber-100 text-amber-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
