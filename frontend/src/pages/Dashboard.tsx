import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Database, Users, FolderKanban, Activity, ArrowUpRight, ArrowDownRight, 
  Zap, FileText, Settings, RefreshCw, Bell, Clock, Server, HardDrive,
  Eye, Edit3, Trash2, Plus, MessageSquare, AlertCircle, CheckCircle
} from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { dashboardApi } from '@/services/api'

interface DashboardProps {
  onNavigate: (path: string) => void
}

interface ActivityItem {
  id: string
  type: 'create' | 'update' | 'delete' | 'view'
  resource: string
  project: string
  user: string
  timestamp: string
  description: string
}

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  is_read: boolean
  created_at: string
}

interface StatsData {
  project_count: number
  user_count: number
  schema_count: number
  today_views: number
  total_records: number
  api_calls: number
  project_change: number
  user_change: number
  schema_change: number
  views_change: number
  records_change: number
  api_change: number
}

interface SystemStatus {
  server: { status: string; response_time: number; uptime: number }
  disk: { usage_percent: number; total_gb: number; used_gb: number; free_gb: number }
  memory: { usage_percent: number; total_mb: number; used_mb: number; free_mb: number }
  connections: { active: number; peak: number }
  database: { status: string; size_mb: number; tables_count: number }
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshingRef = useRef(false)
  const lastUpdatedRef = useRef<Date | null>(null)

  const fetchData = useCallback(async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    setIsRefreshing(true)
    if (!lastUpdatedRef.current) {
      setLoading(true)
    }
    try {
      const [statsRes, activitiesRes, notificationsRes, statusRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getActivities(5),
        dashboardApi.getNotifications(),
        dashboardApi.getSystemStatus(),
      ])

      const statsData = statsRes.data.data as StatsData
      const activitiesData = activitiesRes.data.data as ActivityItem[]
      const notificationsData = notificationsRes.data.data as Notification[]
      const statusData = statusRes.data.data as SystemStatus

      setStats(prev => {
        if (!prev) return statsData
        if (prev.project_count === statsData.project_count &&
            prev.user_count === statsData.user_count &&
            prev.schema_count === statsData.schema_count &&
            prev.today_views === statsData.today_views &&
            prev.total_records === statsData.total_records &&
            prev.api_calls === statsData.api_calls) {
          return prev
        }
        return statsData
      })

      setActivities(prev => {
        if (!prev || prev.length === 0) return activitiesData
        if (prev.length === activitiesData.length &&
            prev.every((a, i) => a.id === activitiesData[i].id)) {
          return prev
        }
        return activitiesData
      })

      setNotifications(prev => {
        const newNotifs = notificationsData.slice(0, 3)
        if (!prev || prev.length === 0) return newNotifs
        if (prev.length === newNotifs.length &&
            prev.every((n, i) => n.id === newNotifs[i].id && n.is_read === newNotifs[i].is_read)) {
          return prev
        }
        return newNotifs
      })

      setSystemStatus(prev => {
        if (!prev) return statusData
        const newDisk = statusData.disk
        const oldDisk = prev.disk
        const newMemory = statusData.memory
        const oldMemory = prev.memory
        if (newDisk.usage_percent === oldDisk.usage_percent &&
            newDisk.used_gb === oldDisk.used_gb &&
            newMemory.usage_percent === oldMemory.usage_percent &&
            newMemory.used_mb === oldMemory.used_mb) {
          return prev
        }
        return statusData
      })

      const now = new Date()
      lastUpdatedRef.current = now
      setLastUpdated(now)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setHasError(true)
    } finally {
      if (!lastUpdatedRef.current) {
        setLoading(false)
      }
      refreshingRef.current = false
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => {
      if (!refreshingRef.current) {
        fetchData()
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleMarkAsRead = async (id: string) => {
    try {
      await dashboardApi.markNotificationAsRead(id)
    } catch {
      // ignore
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const getStatsCards = () => {
    if (!stats) return []
    
    return [
      { icon: FolderKanban, label: '项目数量', value: stats.project_count, change: stats.project_change, color: 'primary' },
      { icon: Users, label: '用户数量', value: stats.user_count, change: stats.user_change, color: 'secondary' },
      { icon: Database, label: '数据模型', value: stats.schema_count, change: stats.schema_change, color: 'success' },
      { icon: Activity, label: '今日访问', value: stats.today_views, change: stats.views_change, color: 'warning' },
      { icon: FileText, label: '总记录数', value: stats.total_records, change: stats.records_change, color: 'info' },
      { icon: Zap, label: 'API调用', value: stats.api_calls, change: stats.api_change, color: 'danger' },
    ]
  }

  const colorClasses: Record<string, string> = {
    primary: 'from-primary/10 to-primary/5 border-primary/20',
    secondary: 'from-secondary/10 to-secondary/5 border-secondary/20',
    success: 'from-success/10 to-success/5 border-success/20',
    warning: 'from-warning/10 to-warning/5 border-warning/20',
    info: 'from-info/10 to-info/5 border-info/20',
    danger: 'from-danger/10 to-danger/5 border-danger/20',
  }

  const iconColorClasses: Record<string, string> = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    success: 'text-success',
    warning: 'text-warning',
    info: 'text-info',
    danger: 'text-danger',
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'create': return <Plus className="w-3 h-3 text-success" />
      case 'update': return <Edit3 className="w-3 h-3 text-primary" />
      case 'delete': return <Trash2 className="w-3 h-3 text-danger" />
      case 'view': return <Eye className="w-3 h-3 text-info" />
      default: return <Activity className="w-3 h-3 text-text-muted" />
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle />
      case 'warning': return <AlertCircle />
      case 'error': return <AlertCircle />
      default: return <MessageSquare />
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + '万'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num.toString()
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}天 ${hours}小时`
    if (hours > 0) return `${hours}小时 ${mins}分`
    return `${mins}分钟`
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div className="space-y-6">
      {hasError && !loading && (
        <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-warning" />
          <div className="flex-1">
            <p className="text-sm font-medium text-warning">数据加载失败</p>
            <p className="text-xs text-text-muted">无法连接到服务器，请检查后端服务是否运行正常</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => { setHasError(false); fetchData() }}>
            <RefreshCw className="w-4 h-4 mr-1" />
            重试
          </Button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <div className={`w-2 h-2 rounded-full ${hasError ? 'bg-warning' : 'bg-success'} animate-pulse`}></div>
          <span>{hasError ? '离线模式' : '实时数据'}</span>
          {lastUpdated && (
            <span className="text-xs">· 更新于 {lastUpdated.toLocaleTimeString('zh-CN')}</span>
          )}
        </div>
        <Button variant="secondary" onClick={() => { setHasError(false); fetchData() }} loading={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? '更新中...' : '刷新数据'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {getStatsCards().map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className={`bg-gradient-to-br ${colorClasses[stat.color]} border`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-text-primary">{formatNumber(stat.value)}</p>
                </div>
                <div className={`p-3 rounded-lg bg-white/50 ${iconColorClasses[stat.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className={`flex items-center gap-1 mt-3 text-sm ${stat.change >= 0 ? 'text-success' : 'text-danger'}`}>
                {stat.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span>{stat.change >= 0 ? '+' : ''}{stat.change}%</span>
                <span className="text-text-muted ml-1">较昨日</span>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="最近活动" className="lg:col-span-1">
          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-bg-hover transition-colors">
                  <div className="w-6 h-6 rounded-full bg-bg-hover flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">
                      <span className="font-medium">{activity.user}</span>
                      {' '}{activity.description}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-bg-hover">{activity.project}</span>
                      <span className="ml-2">{activity.timestamp}</span>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-text-muted">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无活动记录</p>
              </div>
            )}
          </div>
        </Card>

        <Card title="系统通知" className="lg:col-span-1">
          <div className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    notification.is_read ? 'bg-bg-hover' : 'bg-primary/5 border border-primary/10'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    notification.is_read ? 'bg-bg-hover' : 'bg-white'
                  } ${iconColorClasses[notification.type] || 'text-info'}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${notification.is_read ? 'text-text-secondary' : 'font-medium text-text-primary'}`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs text-primary hover:text-primary-hover transition-colors"
                        >
                          标记已读
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-text-muted">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无通知</p>
              </div>
            )}
          </div>
        </Card>

        <Card title="快速操作">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onNavigate('/projects')} className="flex flex-col items-center justify-center p-4 rounded-lg bg-bg-hover hover:bg-border transition-colors">
              <FolderKanban className="w-8 h-8 text-primary mb-2" />
              <span className="text-sm font-medium text-text-primary">项目管理</span>
            </button>
            <button onClick={() => onNavigate('/users')} className="flex flex-col items-center justify-center p-4 rounded-lg bg-bg-hover hover:bg-border transition-colors">
              <Users className="w-8 h-8 text-secondary mb-2" />
              <span className="text-sm font-medium text-text-primary">用户管理</span>
            </button>
            <button onClick={() => onNavigate('/schemas')} className="flex flex-col items-center justify-center p-4 rounded-lg bg-bg-hover hover:bg-border transition-colors">
              <Database className="w-8 h-8 text-success mb-2" />
              <span className="text-sm font-medium text-text-primary">Schema管理</span>
            </button>
            <button onClick={() => onNavigate('/data')} className="flex flex-col items-center justify-center p-4 rounded-lg bg-bg-hover hover:bg-border transition-colors">
              <FileText className="w-8 h-8 text-info mb-2" />
              <span className="text-sm font-medium text-text-primary">数据管理</span>
            </button>
            <button onClick={() => onNavigate('/database')} className="flex flex-col items-center justify-center p-4 rounded-lg bg-bg-hover hover:bg-border transition-colors">
              <HardDrive className="w-8 h-8 text-warning mb-2" />
              <span className="text-sm font-medium text-text-primary">数据库管理</span>
            </button>
            <button onClick={() => onNavigate('/docs')} className="flex flex-col items-center justify-center p-4 rounded-lg bg-bg-hover hover:bg-border transition-colors">
              <Activity className="w-8 h-8 text-danger mb-2" />
              <span className="text-sm font-medium text-text-primary">API文档</span>
            </button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="系统状态" subtitle="服务运行指标">
          {systemStatus && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-bg-hover">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Server className="w-5 h-5 text-success" />
                  </div>
                  <span className="text-sm font-medium text-text-primary">服务器状态</span>
                </div>
                <p className="text-2xl font-bold text-success">{systemStatus.server.status === 'running' ? '正常运行' : '异常'}</p>
                <p className="text-xs text-text-muted mt-1">响应时间: {systemStatus.server.response_time}ms · 运行{formatUptime(systemStatus.server.uptime)}</p>
              </div>
              <div className="p-4 rounded-lg bg-bg-hover">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                    <HardDrive className="w-5 h-5 text-info" />
                  </div>
                  <span className="text-sm font-medium text-text-primary">磁盘使用</span>
                </div>
                <p className="text-2xl font-bold text-info">{systemStatus.disk.usage_percent}%</p>
                <p className="text-xs text-text-muted mt-1">{systemStatus.disk.used_gb}GB / {systemStatus.disk.total_gb}GB</p>
                <div className="w-full h-1.5 bg-bg-hover rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-info to-success rounded-full transition-all" style={{ width: `${systemStatus.disk.usage_percent}%` }}></div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-bg-hover">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-warning" />
                  </div>
                  <span className="text-sm font-medium text-text-primary">内存使用</span>
                </div>
                <p className="text-2xl font-bold text-warning">{systemStatus.memory.usage_percent}%</p>
                <p className="text-xs text-text-muted mt-1">{systemStatus.memory.used_mb}MB / {systemStatus.memory.total_mb}MB</p>
                <div className="w-full h-1.5 bg-bg-hover rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-warning to-danger rounded-full transition-all" style={{ width: `${systemStatus.memory.usage_percent}%` }}></div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-bg-hover">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-text-primary">活跃连接</span>
                </div>
                <p className="text-2xl font-bold text-primary">{systemStatus.connections.active}</p>
                <p className="text-xs text-text-muted mt-1">峰值: {systemStatus.connections.peak} · 数据库: {systemStatus.database.status === 'connected' ? '已连接' : '断开'} ({systemStatus.database.tables_count}张表)</p>
              </div>
            </div>
          )}
        </Card>

        <Card title="快捷入口">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onNavigate('/projects')} className="flex items-center gap-3 p-4 rounded-lg bg-bg-hover hover:bg-border transition-colors text-left">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">创建项目</p>
                <p className="text-xs text-text-muted">新建数据管理项目</p>
              </div>
            </button>
            <button onClick={() => onNavigate('/users')} className="flex items-center gap-3 p-4 rounded-lg bg-bg-hover hover:bg-border transition-colors text-left">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">邀请成员</p>
                <p className="text-xs text-text-muted">管理团队成员</p>
              </div>
            </button>
            <button onClick={() => onNavigate('/data')} className="flex items-center gap-3 p-4 rounded-lg bg-bg-hover hover:bg-border transition-colors text-left">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">录入数据</p>
                <p className="text-xs text-text-muted">添加新记录</p>
              </div>
            </button>
            <button onClick={() => onNavigate('/settings')} className="flex items-center gap-3 p-4 rounded-lg bg-bg-hover hover:bg-border transition-colors text-left">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">系统设置</p>
                <p className="text-xs text-text-muted">配置系统参数</p>
              </div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
