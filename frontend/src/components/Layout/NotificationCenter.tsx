import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Trash2, AlertCircle, Info, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { dashboardApi } from '@/services/api'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  is_read: boolean
  created_at: string
  data?: Record<string, any>
}

interface NotificationCenterProps {
  onNavigate: (path: string) => void
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await dashboardApi.getNotifications()
      const data = response.data?.data || []
      setNotifications(data)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleMarkAsRead = async (id: string) => {
    try {
      await dashboardApi.markNotificationAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error('Failed to mark as read:', err)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await dashboardApi.markAllNotificationsAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Failed to mark all as read:', err)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await dashboardApi.deleteNotification(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      console.error('Failed to delete notification:', err)
      setNotifications(prev => prev.filter(n => n.id !== id))
    }
  }

  const getIcon = (type: string) => {
    const iconClass = 'w-5 h-5'
    switch (type) {
      case 'success': return <CheckCircle className={`${iconClass} text-success`} />
      case 'warning': return <AlertTriangle className={`${iconClass} text-warning`} />
      case 'error': return <AlertCircle className={`${iconClass} text-danger`} />
      default: return <Info className={`${iconClass} text-info`} />
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes} 分钟前`
    if (hours < 24) return `${hours} 小时前`
    if (days < 7) return `${days} 天前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-danger text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-bg-card rounded-xl shadow-xl border border-border z-50">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-text-primary">通知中心</h3>
            <div className="flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin text-text-muted" />}
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-primary hover:text-primary-hover transition-colors"
                >
                  全部标记已读
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p>加载中...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <Bell className="w-12 h-12 mb-3 opacity-50" />
                <p>暂无通知</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 p-4 hover:bg-bg-hover transition-colors ${
                      !notification.is_read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm ${!notification.is_read ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-1 text-text-muted hover:text-success transition-colors"
                              title="标记已读"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-1 text-text-muted hover:text-danger transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-text-muted mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-border text-center">
              <button
                onClick={() => {
                  setIsOpen(false)
                  onNavigate('/dashboard')
                }}
                className="text-sm text-primary hover:text-primary-hover transition-colors"
              >
                查看全部通知
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
