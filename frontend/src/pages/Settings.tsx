import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Server, Shield, Database, Loader2, CheckCircle } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { settingsApi } from '@/services/api'

export function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await settingsApi.getByKeys(['api_url', 'jwt_expire', 'max_upload_size', 'system_name', 'system_logo', 'enable_registration', 'maintenance_mode'])
        const data = response.data?.data || response.data || {}
        const settingsData: Record<string, string> = {}
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            settingsData[item.key] = item.value
          })
        } else if (typeof data === 'object') {
          Object.assign(settingsData, data)
        }
        setSettings(prev => ({ ...prev, ...settingsData }))
      } catch (err: any) {
        setError(err?.response?.data?.message || '加载设置失败')
        setSettings({
          api_url: 'http://localhost:3000',
          jwt_expire: '3600',
          max_upload_size: '10',
          system_name: '管理后台',
          system_logo: 'Admin System',
          enable_registration: 'true',
          maintenance_mode: 'false',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const items = [
        { key: 'api_url', value: settings.api_url || 'http://localhost:3000', description: 'API 地址' },
        { key: 'jwt_expire', value: settings.jwt_expire || '3600', description: 'JWT 过期时间(秒)' },
        { key: 'max_upload_size', value: settings.max_upload_size || '10', description: '最大上传大小(MB)' },
        { key: 'system_name', value: settings.system_name || '管理后台', description: '系统名称' },
        { key: 'system_logo', value: settings.system_logo || 'Admin System', description: '系统Logo文字' },
        { key: 'enable_registration', value: settings.enable_registration || 'true', description: '是否允许注册' },
        { key: 'maintenance_mode', value: settings.maintenance_mode || 'false', description: '维护模式' },
      ]
      await settingsApi.batchUpsert(items)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      setError(err?.response?.data?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const settingSections = [
    {
      icon: Server,
      title: '服务器设置',
      items: [
        { key: 'api_url', label: 'API 地址', type: 'text', placeholder: 'http://localhost:3000' },
      ],
    },
    {
      icon: Shield,
      title: '安全设置',
      items: [
        { key: 'jwt_expire', label: 'JWT 过期时间(秒)', type: 'number', placeholder: '3600' },
        { key: 'enable_registration', label: '允许用户注册', type: 'select', options: [
          { value: 'true', label: '是' },
          { value: 'false', label: '否' },
        ] },
      ],
    },
    {
      icon: Database,
      title: '数据设置',
      items: [
        { key: 'max_upload_size', label: '最大上传大小(MB)', type: 'number', placeholder: '10' },
      ],
    },
    {
      icon: SettingsIcon,
      title: '系统设置',
      items: [
        { key: 'system_name', label: '系统名称', type: 'text', placeholder: '管理后台' },
        { key: 'system_logo', label: 'Logo文字', type: 'text', placeholder: 'Admin System' },
        { key: 'maintenance_mode', label: '维护模式', type: 'select', options: [
          { value: 'false', label: '关闭' },
          { value: 'true', label: '开启' },
        ] },
      ],
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-text-secondary">加载中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">系统设置</h1>
          <p className="text-text-secondary mt-1">配置系统参数和偏好</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? '保存中...' : saved ? '已保存' : '保存设置'}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settingSections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.title}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">{section.title}</h3>
              </div>
              <div className="space-y-4">
                {section.items.map((item) => (
                  <div key={item.key}>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      {item.label}
                    </label>
                    {item.type === 'select' && 'options' in item ? (
                      <select
                        value={settings[item.key] || ''}
                        onChange={(e) => setSettings({ ...settings, [item.key]: e.target.value })}
                        className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="">请选择</option>
                        {item.options!.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={item.type}
                        placeholder={item.placeholder}
                        value={settings[item.key] || ''}
                        onChange={(e) => setSettings({ ...settings, [item.key]: e.target.value })}
                        className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-warning" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">关于系统</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-bg-hover rounded-lg">
            <p className="text-sm text-text-muted mb-1">系统版本</p>
            <p className="font-medium text-text-primary">1.0.0</p>
          </div>
          <div className="p-4 bg-bg-hover rounded-lg">
            <p className="text-sm text-text-muted mb-1">框架</p>
            <p className="font-medium text-text-primary">NestJS + React</p>
          </div>
          <div className="p-4 bg-bg-hover rounded-lg">
            <p className="text-sm text-text-muted mb-1">数据库</p>
            <p className="font-medium text-text-primary">SQLite</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
