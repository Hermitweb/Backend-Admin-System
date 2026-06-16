import { useState } from 'react'
import { Mail, Lock, User, Database } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useAuthStore } from '@/store/auth'

interface LoginProps {
  onNavigate: (path: string) => void
}

export function Login({ onNavigate }: LoginProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  })
  const { login, register, loading } = useAuthStore()
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (isLogin) {
        await login(formData.email, formData.password)
        onNavigate('/dashboard')
      } else {
        await register(formData.email, formData.password, formData.name)
        onNavigate('/dashboard')
      }
    } catch (err) {
      setError('操作失败，请检查输入信息')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md p-8 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-xl mb-4">
            <Database className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">管理后台</h1>
          <p className="text-slate-400">欢迎回来，请登录您的账户</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <Input
              label="用户名"
              type="text"
              placeholder="请输入用户名"
              icon={<User className="w-4 h-4" />}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          )}
          <Input
            label="邮箱"
            type="email"
            placeholder="请输入邮箱地址"
            icon={<Mail className="w-4 h-4" />}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="密码"
            type="password"
            placeholder="请输入密码"
            icon={<Lock className="w-4 h-4" />}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {isLogin ? '登录' : '注册'}
          </Button>
        </form>

        <p className="text-center mt-6 text-slate-400">
          {isLogin ? '还没有账户？' : '已有账户？'}
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
            }}
            className="ml-1 text-primary hover:text-primary-hover font-medium transition-colors"
          >
            {isLogin ? '立即注册' : '立即登录'}
          </button>
        </p>
      </div>
    </div>
  )
}
