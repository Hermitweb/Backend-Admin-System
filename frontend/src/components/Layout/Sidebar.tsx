import { useState } from 'react'
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Database, 
  Table,
  Link, 
  FileText, 
  Settings,
  Shield,
  ChevronRight,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  currentPath: string
  onNavigate: (path: string) => void
}

const menuItems = [
  { icon: LayoutDashboard, path: '/dashboard', label: '控制台' },
  { icon: FolderKanban, path: '/projects', label: '项目管理' },
  { icon: Users, path: '/users', label: '用户管理' },
  { icon: Shield, path: '/permissions', label: '权限设置' },
  { icon: Database, path: '/schemas', label: 'Schema管理' },
  { icon: Table, path: '/data', label: '项目数据管理' },
  { icon: Database, path: '/database', label: '数据库管理' },
  { icon: Link, path: '/links', label: '联动规则' },
  { icon: FileText, path: '/docs', label: 'API文档' },
  { icon: Settings, path: '/settings', label: '系统设置' },
]

export function Sidebar({ collapsed, onToggle, currentPath, onNavigate }: SidebarProps) {
  const { logout } = useAuthStore()
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const handleLogout = () => {
    logout()
    onNavigate('/login')
  }

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-bg-sidebar text-white transition-all duration-300 flex flex-col z-50 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">管理后台</h1>
              <p className="text-xs text-slate-400">Admin System</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto">
            <Database className="w-5 h-5" />
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.path
          const isExpanded = expandedItem === item.path

          return (
            <button
              key={item.path}
              onClick={() => {
                onNavigate(item.path)
                setExpandedItem(null)
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
              {!collapsed && (
                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
              )}
              {!collapsed && (
                <ChevronRight 
                  className={`w-4 h-4 transition-transform ${isActive ? 'text-white' : 'text-slate-400'}`} 
                />
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-slate-800 rounded-lg shadow-xl whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">退出登录</span>}
        </button>
      </div>

      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-600 hover:text-white transition-colors shadow-lg"
      >
        {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
      </button>
    </aside>
  )
}
