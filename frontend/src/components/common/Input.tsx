import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-text-primary">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </span>
        )}
        <input
          className={`w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${icon ? 'pl-10' : ''} ${error ? 'border-danger focus:border-danger' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}
    </div>
  )
}
