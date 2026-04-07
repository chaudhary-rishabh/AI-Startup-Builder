// ─── Utilities ───────────────────────────────────────────────────────────────
export { cn } from './lib/cn'
export { buttonVariants, badgeVariants } from './lib/variants'

// ─── shadcn/ui Components ─────────────────────────────────────────────────────
export { Button } from './components/shadcn/button'
export type { ButtonProps } from './components/shadcn/button'

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/shadcn/card'

export { Input } from './components/shadcn/input'
export type { InputProps } from './components/shadcn/input'

export { Badge } from './components/shadcn/badge'
export type { BadgeProps } from './components/shadcn/badge'

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/shadcn/dialog'

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from './components/shadcn/select'

export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/shadcn/tabs'

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/shadcn/tooltip'

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './components/shadcn/dropdown-menu'

export { Avatar, AvatarImage, AvatarFallback } from './components/shadcn/avatar'

export { Progress } from './components/shadcn/progress'

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './components/shadcn/table'

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from './components/shadcn/toast'
export type { ToastProps, ToastActionElement } from './components/shadcn/toast'

// ─── Custom Product Components ────────────────────────────────────────────────
export { PhaseBadge } from './components/custom/PhaseBadge'
export { ScoreCircle } from './components/custom/ScoreCircle'
export { AgentStatusDot } from './components/custom/AgentStatusDot'
export { PlanBadge } from './components/custom/PlanBadge'
export { TokenUsageBar } from './components/custom/TokenUsageBar'
export { CopyButton } from './components/custom/CopyButton'
export { LoadingSpinner } from './components/custom/LoadingSpinner'
export { EmptyState } from './components/custom/EmptyState'
export { ConfirmDialog } from './components/custom/ConfirmDialog'
export { DataTable } from './components/custom/DataTable'
