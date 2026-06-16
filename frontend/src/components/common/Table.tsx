import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface TableProps {
  headers: string[]
  children: ReactNode
  pagination?: ReactNode
}

export function Table({ headers, children, pagination }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-bg-hover">
            {headers.map((header, index) => (
              <th 
                key={index} 
                className="px-4 py-3 text-left text-sm font-semibold text-text-secondary uppercase tracking-wider"
              >
                <div className="flex items-center gap-1">
                  {header}
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {children}
        </tbody>
      </table>
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-hover">
          {pagination}
        </div>
      )}
    </div>
  )
}
