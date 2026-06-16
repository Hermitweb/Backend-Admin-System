import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  loading?: boolean
}

const variantStyles = {
  primary: 'bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
  success: 'bg-success hover:bg-emerald-600 text-white',
  warning: 'bg-warning hover:bg-amber-600 text-white',
  danger: 'bg-danger hover:bg-red-600 text-white',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
  outline: 'bg-transparent border border-border hover:bg-bg-hover text-text-primary',
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled, 
  children, 
  className = '', 
  ...props 
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      ) : (
        children
      )}
    </button>
  )
}
