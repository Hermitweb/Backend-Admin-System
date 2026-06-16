import { useState } from 'react'
import { Mail, Lock, User, Database, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useAuthStore } from '@/store/auth'

interface LoginProps {
  onNavigate: (path: string) => void
}

interface FormErrors {
  email?: string
  password?: string
  name?: string
}

export function Login({ onNavigate }: LoginProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  })
  const { login, register, loading } = useAuthStore()
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!formData.email) {
      newErrors.email = '请输入邮箱地址'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确'
    }
    
    if (!formData.password) {
      newErrors.password = '请输入密码'
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少需要6位'
    }
    
    if (!isLogin && !formData.name.trim()) {
      newErrors.name = '请输入用户名'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) {
      return
    }

    try {
      if (isLogin) {
        await login(formData.email, formData.password)
        onNavigate('/dashboard')
      } else {
        if (!formData.name.trim()) {
          setErrors(prev => ({ ...prev, name: '请输入用户名' }))
          return
        }
        await register(formData.email, formData.password, formData.name)
        onNavigate('/dashboard')
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || ''
      if (message.includes('Invalid credentials')) {
        setError('邮箱或密码错误，请重试')
      } else if (message.includes('Email already exists')) {
        setError('该邮箱已被注册，请使用其他邮箱或直接登录')
      } else if (message.includes('Unauthorized')) {
        setError('账号或密码错误')
      } else {
        setError('操作失败，请检查输入信息')
      }
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, email: e.target.value })
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }))
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, password: e.target.value })
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: undefined }))
    }
    if (error) {
      setError('')
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value })
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }))
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setErrors({})
    setFormData({ email: '', password: '', name: '' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="p-8 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-xl mb-4 shadow-lg">
              <Database className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">管理后台</h1>
            <p className="text-slate-400 text-sm">
              {isLogin ? '欢迎回来，请登录您的账户' : '创建账户，开始您的管理之旅'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {!isLogin && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">用户名</label>
                <div className={`relative ${errors.name ? 'ring-2 ring-red-500 rounded-lg' : ''}`}>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="请输入用户名"
                    value={formData.name}
                    onChange={handleNameChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
                {errors.name && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">邮箱</label>
              <div className={`relative ${errors.email ? 'ring-2 ring-red-500 rounded-lg' : ''}`}>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="请输入邮箱地址"
                  value={formData.email}
                  onChange={handleEmailChange}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">密码</label>
              <div className={`relative ${errors.password ? 'ring-2 ring-red-500 rounded-lg' : ''}`}>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password}
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full py-3 text-base font-medium">
              {loading ? '处理中...' : (isLogin ? '登录' : '注册账户')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              {isLogin ? '还没有账户？' : '已有账户？'}
              <button
                type="button"
                onClick={toggleMode}
                className="ml-1 text-primary hover:text-primary-hover font-medium transition-colors"
              >
                {isLogin ? '立即注册' : '立即登录'}
              </button>
            </p>
          </div>
        </div>

        {isLogin && (
          <div className="mt-4 text-center text-slate-500 text-xs">
            <p>默认管理员: admin@example.com / admin123</p>
          </div>
        )}
      </div>
    </div>
  )
}
