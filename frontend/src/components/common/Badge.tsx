import type { ReactNode } from 'react'

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
}

const variantStyles = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
}

export function Badge({ children, variant = 'primary' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${variantStyles[variant]}`}>
      {children}
    </span>
  )
}
