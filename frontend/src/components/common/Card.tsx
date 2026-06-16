import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  onClick?: () => void
}

export function Card({ children, className = '', title, subtitle, onClick }: CardProps) {
  return (
    <div 
      className={`bg-bg-card rounded-lg shadow-sm border border-border overflow-hidden ${className}`}
      onClick={onClick}
    >
      {title && (
        <div className="px-3 py-2 border-b border-border">
          <h3 className="text-xs font-semibold text-text-primary">{title}</h3>
          {subtitle && <p className="text-[10px] text-text-muted mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="p-3">
        {children}
      </div>
    </div>
  )
}
