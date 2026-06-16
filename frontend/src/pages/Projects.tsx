import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, RefreshCw } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { Badge } from '@/components/common/Badge'
import { projectApi } from '@/services/api'
import type { Project, CreateProjectDto, UpdateProjectDto } from '@/types'

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState<CreateProjectDto>({
    slug: '',
    name: '',
    description: '',
  })

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await projectApi.getAll()
      setProjects(response.data.data)
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleSubmit = async () => {
    try {
      if (editingProject) {
        await projectApi.update(editingProject.id, formData as UpdateProjectDto)
      } else {
        await projectApi.create(formData)
      }
      setModalOpen(false)
      setEditingProject(null)
      setFormData({ slug: '', name: '', description: '' })
      await fetchProjects()
    } catch (err) {
      console.error('Failed to save project:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个项目吗？')) {
      try {
        await projectApi.delete(id)
        await fetchProjects()
      } catch (err) {
        console.error('Failed to delete project:', err)
      }
    }
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      slug: project.slug,
      name: project.name,
      description: project.description || '',
    })
    setModalOpen(true)
  }

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">项目管理</h1>
          <p className="text-text-secondary mt-1">管理您的所有项目</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          新建项目
        </Button>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="搜索项目..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 bg-bg-hover border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <Button variant="secondary" onClick={fetchProjects} loading={loading}>
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-hover">
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">项目名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">标识</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">描述</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">创建时间</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-text-primary">{project.name}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary font-mono text-sm">{project.slug}</td>
                  <td className="px-4 py-3 text-text-secondary text-sm max-w-xs truncate">
                    {project.description || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={project.status === 'active' ? 'success' : 'warning'}>
                      {project.status === 'active' ? '活跃' : '停用'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-sm">
                    {project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(project)}
                        className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
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
          {filteredProjects.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              <p>暂无项目数据</p>
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingProject(null)
          setFormData({ slug: '', name: '', description: '' })
        }}
        title={editingProject ? '编辑项目' : '新建项目'}
      >
        <div className="space-y-4">
          <Input
            label="项目标识"
            type="text"
            placeholder="project-slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          />
          <Input
            label="项目名称"
            type="text"
            placeholder="项目名称"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">描述</label>
            <textarea
              placeholder="项目描述..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSubmit}>{editingProject ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
