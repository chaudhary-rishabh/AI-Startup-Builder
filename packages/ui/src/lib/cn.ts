import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merges Tailwind classes intelligently — handles conflicts and conditional classes. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
