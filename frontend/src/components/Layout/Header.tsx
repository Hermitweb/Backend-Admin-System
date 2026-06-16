import { Search, User } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { NotificationCenter } from './NotificationCenter'

interface HeaderProps {
  title: string
  onNavigate: (path: string) => void
}

export function Header({ title, onNavigate }: HeaderProps) {
  const { user } = useAuthStore()

  return (
    <header className="h-16 bg-bg-card border-b border-border flex items-center justify-between px-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
        <p className="text-sm text-text-secondary mt-0.5">欢迎回来，{user?.name || '管理员'}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="搜索..."
            className="w-64 pl-10 pr-4 py-2 bg-bg-hover border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <NotificationCenter onNavigate={onNavigate} />

        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-text-primary">{user?.name || '管理员'}</p>
            <p className="text-xs text-text-muted">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
