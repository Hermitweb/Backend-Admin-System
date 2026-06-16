import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Trash2, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react'
import type { Notification } from '@/services/notificationApi'

interface NotificationCenterProps {
  onNavigate: (path: string) => void
}

const STORAGE_KEY = 'admin_notifications'

const getDefaultNotifications = (): Notification[] => {
  const now = new Date()
  return [
    {
      id: 'welcome',
      type: 'info',
      title: '欢迎使用系统',
      message: '您已成功登录后台管理系统',
      is_read: false,
      created_at: now.toISOString(),
    },
    {
      id: 'project_created',
      type: 'success',
      title: '项目已创建',
      message: '个人项目 创建成功，开始管理您的数据吧',
      is_read: false,
      created_at: new Date(now.getTime() - 300000).toISOString(),
    },
    {
      id: 'permission_updated',
      type: 'info',
      title: '权限系统已更新',
      message: '新增了项目级权限控制，支持更细粒度的访问管理',
      is_read: true,
      created_at: new Date(now.getTime() - 1800000).toISOString(),
    },
    {
      id: 'backup_reminder',
      type: 'warning',
      title: '数据备份提醒',
      message: '建议定期备份您的重要数据，确保数据安全',
      is_read: true,
      created_at: new Date(now.getTime() - 3600000).toISOString(),
    },
  ]
}

const loadNotifications = (): Notification[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load notifications:', e)
  }
  const defaults = getDefaultNotifications()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
  return defaults
}

const saveNotifications = (notifications: Notification[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
  } catch (e) {
    console.error('Failed to save notifications:', e)
  }
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const data = loadNotifications()
    setNotifications(data)
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

  const handleMarkAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, is_read: true } : n)
    setNotifications(updated)
    saveNotifications(updated)
  }

  const handleMarkAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, is_read: true }))
    setNotifications(updated)
    saveNotifications(updated)
  }

  const handleDelete = (id: string) => {
    const updated = notifications.filter(n => n.id !== id)
    setNotifications(updated)
    saveNotifications(updated)
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
          <span className="absolute top-0 right-0 w-5 h-5 bg-danger text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-bg-card rounded-xl shadow-xl border border-border z-50">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-text-primary">通知中心</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-primary hover:text-primary-hover transition-colors"
              >
                全部标记已读
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
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
