import { useState, useEffect, memo } from 'react'
import { 
  Edit, 
  Trash2, 
  Search, 
  RefreshCw, 
  Users as UsersIcon, 
  Plus,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Shield,
  FolderKanban,
  X,
  Check
} from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ProjectRoleItem } from '@/components/common/ProjectRoleItem'
import { userApi, projectApi, projectMemberApi } from '@/services/api'
import type { User, Project } from '@/types'

type SystemRole = 'super_admin' | 'admin' | 'user'
type ProjectRole = 'admin' | 'editor' | 'viewer'

interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: ProjectRole
  project?: Project
}

export function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'create' | 'edit'>('create')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [projectRoleModalOpen, setProjectRoleModalOpen] = useState(false)
  const [currentProjectRoles, setCurrentProjectRoles] = useState<ProjectMember[]>([])
  const [projectRoles, setProjectRoles] = useState<Record<string, ProjectRole>>({})
  const [projectRolesLoading, setProjectRolesLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '' as string | undefined,
    status: 'active' as 'active' | 'inactive',
    role: 'user' as SystemRole,
  })

  const fetchUsers = async (page = pagination.page, limit = pagination.limit, search = searchTerm) => {
    setLoading(true)
    try {
      const response = await userApi.getAll({ page, limit, search })
      setUsers(response.data.data.items)
      setPagination(prev => ({ ...prev, total: response.data.data.total, page, limit }))
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await projectApi.getAll()
      setProjects(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }

  const fetchUserProjectRoles = async (userId: string) => {
    setProjectRolesLoading(true)
    try {
      const response = await projectMemberApi.getUserMemberships(userId)
      const members = response.data.data || []
      const rolesMap: Record<string, ProjectRole> = {}
      members.forEach((m: ProjectMember) => {
        rolesMap[m.project_id] = m.role
      })
      setCurrentProjectRoles(members)
      setProjectRoles(rolesMap)
    } catch (err) {
      console.error('Failed to fetch user project roles:', err)
      setCurrentProjectRoles([])
      setProjectRoles({})
    } finally {
      setProjectRolesLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchProjects()
  }, [])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = '请输入用户名'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = '请输入邮箱'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
    }
    
    if (formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = '密码长度至少6位'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    
    try {
      if (modalType === 'create') {
        await userApi.create({ ...formData, password: formData.password || '' })
      } else if (editingUser) {
        const updateData = { name: formData.name, email: formData.email, status: formData.status, role: formData.role }
        if (formData.password) {
          await userApi.update(editingUser.id, { ...updateData, password: formData.password })
        } else {
          await userApi.update(editingUser.id, updateData)
        }
      }
      setModalOpen(false)
      setEditingUser(null)
      setFormData({ name: '', email: '', password: '', status: 'active', role: 'user' })
      setErrors({})
      await fetchUsers()
    } catch (err: any) {
      console.error('Failed to save user:', err)
      if (err.response?.data?.message === 'Email already exists') {
        setErrors({ email: '该邮箱已被注册' })
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个用户吗？')) {
      try {
        await userApi.delete(id)
        await fetchUsers()
      } catch (err) {
        console.error('Failed to delete user:', err)
      }
    }
  }

  const handleBatchDelete = async () => {
    if (selectedUsers.length === 0) {
      alert('请先选择要删除的用户')
      return
    }
    if (confirm(`确定要删除选中的 ${selectedUsers.length} 个用户吗？`)) {
      try {
        await userApi.batchDelete(selectedUsers)
        setSelectedUsers([])
        await fetchUsers()
      } catch (err) {
        console.error('Failed to batch delete users:', err)
      }
    }
  }

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    try {
      await userApi.updateStatus(user.id, newStatus)
      await fetchUsers()
    } catch (err) {
      console.error('Failed to update user status:', err)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setModalType('edit')
    setFormData({
      name: user.name || '',
      email: user.email,
      password: '',
      status: user.status,
      role: user.role,
    })
    setErrors({})
    setModalOpen(true)
  }

  const handleCreate = () => {
    setEditingUser(null)
    setModalType('create')
    setFormData({ name: '', email: '', password: '', status: 'active', role: 'user' })
    setErrors({})
    setModalOpen(true)
  }

  const handleOpenProjectRoles = async (user: User) => {
    setEditingUser(user)
    setProjectRoleModalOpen(true)
    setCurrentProjectRoles([])
    setProjectRoles({})
    await fetchUserProjectRoles(user.id)
  }

  const handleProjectRoleChange = async (projectId: string, newRole: ProjectRole) => {
    if (!editingUser) return

    const existingRole = projectRoles[projectId]
    try {
      if (existingRole === newRole) {
        return
      }

      setProjectRoles(prev => ({ ...prev, [projectId]: newRole }))

      if (existingRole) {
        await projectMemberApi.updateRole(projectId, editingUser.id, newRole)
      } else {
        await projectMemberApi.addMember({
          project_id: projectId,
          user_id: editingUser.id,
          role: newRole,
        })
      }

      await fetchUserProjectRoles(editingUser.id)
    } catch (err) {
      console.error('Failed to update project role:', err)
      alert('更新项目角色失败')
      await fetchUserProjectRoles(editingUser.id)
    }
  }

  const handleRemoveFromProject = async (projectId: string) => {
    if (!editingUser) return
    
    if (!confirm('确定要将该用户从项目中移除吗？')) return

    try {
      await projectMemberApi.removeMember(projectId, editingUser.id)
      setProjectRoles(prev => {
        const next = { ...prev }
        delete next[projectId]
        return next
      })
      await fetchUserProjectRoles(editingUser.id)
    } catch (err) {
      console.error('Failed to remove user from project:', err)
    }
  }

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchUsers(1, pagination.limit, searchTerm)
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > Math.ceil(pagination.total / pagination.limit)) return
    setPagination(prev => ({ ...prev, page }))
    fetchUsers(page, pagination.limit, searchTerm)
  }

  const handleLimitChange = (limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }))
    fetchUsers(1, limit, searchTerm)
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(u => u.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const getSystemRoleColor = (role: SystemRole) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-700 border-red-200'
      case 'admin': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default: return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  const getSystemRoleLabel = (role: SystemRole) => {
    switch (role) {
      case 'super_admin': return '超级管理员'
      case 'admin': return '管理员'
      default: return '普通用户'
    }
  }

  const getProjectRoleColor = (role: ProjectRole) => {
    switch (role) {
      case 'admin': return 'bg-red-50 text-red-600 border-red-200'
      case 'editor': return 'bg-green-50 text-green-600 border-green-200'
      default: return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  const getProjectRoleLabel = (role: ProjectRole) => {
    switch (role) {
      case 'admin': return '项目管理员'
      case 'editor': return '编辑者'
      default: return '查看者'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">用户管理</h1>
          <p className="text-text-secondary mt-1">
            管理系统用户，区分<span className="font-medium text-primary">系统角色</span>和
            <span className="font-medium text-secondary">项目角色</span>
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          添加用户
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border-l-4 border-red-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">系统角色</h3>
              <p className="text-sm text-text-secondary">控制用户在整个系统中的权限</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-blue-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">项目角色</h3>
              <p className="text-sm text-text-secondary">控制用户在特定项目中的权限</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="搜索用户..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-64 pl-10 pr-4 py-2 bg-bg-hover border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <Button variant="secondary" onClick={handleSearch} loading={loading}>
              <Search className="w-4 h-4" />
              搜索
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">每页:</span>
              <select
                value={pagination.limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="px-3 py-1.5 bg-bg-hover border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <Button variant="secondary" onClick={() => fetchUsers()} loading={loading}>
              <RefreshCw className="w-4 h-4" />
              刷新
            </Button>
            {selectedUsers.length > 0 && (
              <Button variant="danger" onClick={handleBatchDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                批量删除 ({selectedUsers.length})
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-hover">
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary w-12">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-border text-primary focus:ring-primary/20"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">用户</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">邮箱</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">系统角色</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">项目角色</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      className="rounded border-border text-primary focus:ring-primary/20"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <UsersIcon className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium text-text-primary">{user.name || '未设置'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary font-mono text-sm">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getSystemRoleColor(user.role)}`}>
                      <Shield className="w-3 h-3" />
                      {getSystemRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleOpenProjectRoles(user)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <FolderKanban className="w-3 h-3" />
                      管理项目权限
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.status === 'active' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {user.status === 'active' ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`p-2 rounded-lg transition-all ${
                          user.status === 'active'
                            ? 'text-text-secondary hover:text-danger hover:bg-danger/10'
                            : 'text-text-secondary hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={user.status === 'active' ? '禁用' : '启用'}
                      >
                        {user.status === 'active' ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        title="编辑系统角色"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              <UsersIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无用户数据</p>
            </div>
          )}
        </div>

        {users.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-sm text-text-secondary">
              显示第 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 条，共 {pagination.total} 条
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.ceil(pagination.total / pagination.limit) }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === pagination.page ? 'primary' : 'outline'}
                  onClick={() => handlePageChange(page)}
                  className={`w-8 h-8 p-0 ${page === pagination.page ? 'text-white' : ''}`}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                className="p-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingUser(null)
          setFormData({ name: '', email: '', password: '', status: 'active', role: 'user' })
          setErrors({})
        }}
        title={modalType === 'create' ? '添加用户 - 设置系统角色' : '编辑用户 - 修改系统角色'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">用户名</label>
            <input
              type="text"
              placeholder="请输入用户名"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2.5 bg-bg-card border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                errors.name ? 'border-danger' : 'border-border'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-danger flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">邮箱</label>
            <input
              type="email"
              placeholder="请输入邮箱地址"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-4 py-2.5 bg-bg-card border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                errors.email ? 'border-danger' : 'border-border'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-danger flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.email}
              </p>
            )}
          </div>

          <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                {modalType === 'create' ? '密码' : '新密码（留空则不修改）'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={modalType === 'create' ? '请输入密码（至少6位）' : '请输入新密码（至少6位，留空则不修改）'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-4 py-2.5 bg-bg-card border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary pr-10 ${
                    errors.password ? 'border-danger' : 'border-border'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-danger flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password}
                </p>
              )}
            </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <label className="block text-sm font-medium text-text-primary mb-1.5 flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              系统角色（全局权限）
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as SystemRole })}
              className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="super_admin">超级管理员 - 拥有所有权限</option>
              <option value="admin">管理员 - 管理用户和项目</option>
              <option value="user">普通用户 - 基础访问权限</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">状态</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="active">启用</option>
              <option value="inactive">禁用</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSubmit}>{modalType === 'create' ? '创建' : '保存'}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={projectRoleModalOpen}
        onClose={() => {
          setProjectRoleModalOpen(false)
          setEditingUser(null)
          setCurrentProjectRoles([])
          setProjectRoles({})
        }}
        title={editingUser ? `项目权限管理 - ${editingUser.name || editingUser.email}` : '项目权限管理'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-text-primary mb-1 flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-blue-500" />
              项目角色说明
            </h4>
            <div className="text-sm text-text-secondary space-y-1">
              <p><span className="font-medium text-red-600">项目管理员</span> - 完全控制项目，包括成员管理</p>
              <p><span className="font-medium text-green-600">编辑者</span> - 可以创建、修改、删除数据</p>
              <p><span className="font-medium text-gray-600">查看者</span> - 只能查看数据</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-text-primary">分配项目角色</h4>
            {projectRolesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-text-secondary text-sm">加载中...</span>
              </div>
            ) : projects.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">暂无项目，请先创建项目</p>
            ) : (
              <ProjectRoleList 
                projects={projects}
                projectRoles={projectRoles}
                onRoleChange={handleProjectRoleChange}
                onRemove={handleRemoveFromProject}
              />
            )}
          </div>

          {!projectRolesLoading && currentProjectRoles.length > 0 && (
            <div className="pt-2 border-t border-border">
              <h4 className="font-medium text-text-primary mb-2">当前项目权限</h4>
              <div className="flex flex-wrap gap-2">
                {currentProjectRoles.map((member) => (
                  <span
                    key={`${member.project_id}-${member.user_id}`}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getProjectRoleColor(member.role)}`}
                  >
                    <FolderKanban className="w-3 h-3" />
                    {member.project?.name} ({getProjectRoleLabel(member.role)})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={() => {
              setProjectRoleModalOpen(false)
              setEditingUser(null)
            }}>关闭</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

interface ProjectRoleListProps {
  projects: Project[]
  projectRoles: Record<string, ProjectRole>
  onRoleChange: (projectId: string, role: ProjectRole) => void
  onRemove: (projectId: string) => void
}

const ProjectRoleList = memo(function ProjectRoleList({ 
  projects, 
  projectRoles, 
  onRoleChange, 
  onRemove 
}: ProjectRoleListProps) {
  return (
    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
      {projects.map((project) => (
        <ProjectRoleItem
          key={project.id}
          project={project}
          currentRole={projectRoles[project.id]}
          onRoleChange={onRoleChange}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
})
