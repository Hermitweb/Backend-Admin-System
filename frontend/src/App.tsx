import { useState, useEffect, Component } from 'react'
import type { ErrorInfo } from 'react'
import { Layout } from '@/components/Layout/Layout'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Projects } from '@/pages/Projects'
import { Users } from '@/pages/Users'
import { Permissions } from '@/pages/Permissions'
import { Schemas } from '@/pages/Schemas'
import { DataManager } from '@/pages/DataManager'
import { DatabaseManager } from '@/pages/Database'
import { ProjectSettings } from '@/pages/ProjectSettings'
import { Links } from '@/pages/Links'
import { Docs } from '@/pages/Docs'
import { Settings } from '@/pages/Settings'
import { useAuthStore } from '@/store/auth'
import { Loader2 } from 'lucide-react'

const pageTitleMap: Record<string, string> = {
  '/dashboard': '控制台',
  '/projects': '项目管理',
  '/users': '用户管理',
  '/permissions': '权限设置',
  '/schemas': 'Schema管理',
  '/data': '项目数据管理',
  '/database': '数据库管理',
  '/project-settings': '项目数据库管理',
  '/links': '联动规则',
  '/docs': 'API文档',
  '/settings': '系统设置',
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo })
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg-main">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-danger/10 rounded-full flex items-center justify-center">
              <span className="text-3xl">!</span>
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">页面加载出错</h2>
            <p className="text-text-secondary mb-4">请刷新页面重试</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [initializing, setInitializing] = useState(true)
  const { isLoggedIn, initialize } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      try {
        initialize()
      } finally {
        setInitializing(false)
      }
    }
    initAuth()

    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [initialize])

  const handleNavigate = (path: string) => {
    setCurrentPath(path)
    window.history.pushState({}, '', path)
  }

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="mt-4 text-text-secondary">加载中...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Login onNavigate={handleNavigate} />
  }

  const renderPage = () => {
    switch (currentPath) {
      case '/dashboard':
        return <Dashboard onNavigate={handleNavigate} />
      case '/projects':
        return <Projects />
      case '/users':
        return <Users />
      case '/permissions':
        return <Permissions />
      case '/schemas':
        return <Schemas />
      case '/data':
        return <DataManager />
      case '/database':
        return <DatabaseManager />
      case '/project-settings':
        return <ProjectSettings />
      case '/links':
        return <Links />
      case '/docs':
        return <Docs />
      case '/settings':
        return <Settings />
      default:
        return <Dashboard onNavigate={handleNavigate} />
    }
  }

  return (
    <ErrorBoundary>
      <Layout 
        title={pageTitleMap[currentPath] || '控制台'} 
        currentPath={currentPath}
        onNavigate={handleNavigate}
      >
        {renderPage()}
      </Layout>
    </ErrorBoundary>
  )
}
