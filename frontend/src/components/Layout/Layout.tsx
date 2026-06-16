import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface LayoutProps {
  children: React.ReactNode
  title: string
  currentPath: string
  onNavigate: (path: string) => void
}

export function Layout({ children, title, currentPath, onNavigate }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-bg-main">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentPath={currentPath}
        onNavigate={onNavigate}
      />
      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Header title={title} onNavigate={onNavigate} />
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
