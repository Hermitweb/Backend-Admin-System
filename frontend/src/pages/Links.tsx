import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Link as LinkIcon, RefreshCw } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { projectApi, linkApi } from '@/services/api'
import type { Project, LinkRule } from '@/types'

export function Links() {
  const [projects, setProjects] = useState<Project[]>([])
  const [links, setLinks] = useState<LinkRule[]>([])
  const [loading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<LinkRule | null>(null)
  const [formData, setFormData] = useState({
    sourceProjectId: '',
    targetProjectId: '',
    sourceResource: '',
    targetResource: '',
    mapping: '{}',
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, linksRes] = await Promise.all([
          projectApi.getAll(),
          linkApi.getAll(),
        ])
        setProjects(projectsRes.data.data)
        setLinks(linksRes.data.data)
      } catch (err) {
        console.error('Failed to fetch data:', err)
      }
    }
    fetchData()
  }, [])

  const handleSubmit = async () => {
    try {
      const mappingData = JSON.parse(formData.mapping)
      if (editingLink) {
        await linkApi.update(editingLink.id, {
          sourceProjectId: formData.sourceProjectId,
          targetProjectId: formData.targetProjectId,
          sourceResource: formData.sourceResource,
          targetResource: formData.targetResource,
          mapping: mappingData,
        })
      } else {
        await linkApi.create({
          sourceProjectId: formData.sourceProjectId,
          targetProjectId: formData.targetProjectId,
          sourceResource: formData.sourceResource,
          targetResource: formData.targetResource,
          mapping: mappingData,
        })
      }
      setModalOpen(false)
      setEditingLink(null)
      setFormData({ sourceProjectId: '', targetProjectId: '', sourceResource: '', targetResource: '', mapping: '{}' })
      await linkApi.getAll().then(res => setLinks(res.data.data))
    } catch (err) {
      console.error('Failed to save link:', err)
      alert('Mapping格式无效')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个联动规则吗？')) {
      try {
        await linkApi.delete(id)
        await linkApi.getAll().then(res => setLinks(res.data.data))
      } catch (err) {
        console.error('Failed to delete link:', err)
      }
    }
  }

  const handleEdit = (link: LinkRule) => {
    setEditingLink(link)
    setFormData({
      sourceProjectId: link.sourceProjectId,
      targetProjectId: link.targetProjectId,
      sourceResource: link.sourceResource,
      targetResource: link.targetResource,
      mapping: JSON.stringify(link.mapping, null, 2),
    })
    setModalOpen(true)
  }

  const getProjectName = (id: string) => {
    return projects.find(p => p.id === id)?.name || id
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">联动规则</h1>
          <p className="text-text-secondary mt-1">管理跨项目数据联动</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          新建规则
        </Button>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">联动规则列表</h3>
          <Button variant="secondary" onClick={() => linkApi.getAll().then(res => setLinks(res.data.data))} loading={loading}>
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
        </div>

        <div className="space-y-3">
          {links.length > 0 ? (
            links.map((link) => (
              <div 
                key={link.id}
                className="p-4 bg-bg-hover rounded-lg border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                      <LinkIcon className="w-4 h-4 text-info" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">
                        {getProjectName(link.sourceProjectId)} / {link.sourceResource}
                      </p>
                      <p className="text-sm text-text-muted">
                        → {getProjectName(link.targetProjectId)} / {link.targetResource}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(link)}
                      className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <pre className="mt-3 p-3 bg-bg-card rounded-lg text-xs text-text-muted overflow-x-auto">
                  {JSON.stringify(link.mapping, null, 2)}
                </pre>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-text-muted">
              <LinkIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>暂无联动规则</p>
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingLink(null)
          setFormData({ sourceProjectId: '', targetProjectId: '', sourceResource: '', targetResource: '', mapping: '{}' })
        }}
        title={editingLink ? '编辑联动规则' : '新建联动规则'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">源项目</label>
              <select
                value={formData.sourceProjectId}
                onChange={(e) => setFormData({ ...formData, sourceProjectId: e.target.value })}
                className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">选择项目</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">源资源</label>
              <input
                type="text"
                placeholder="如: users"
                value={formData.sourceResource}
                onChange={(e) => setFormData({ ...formData, sourceResource: e.target.value })}
                className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">目标项目</label>
              <select
                value={formData.targetProjectId}
                onChange={(e) => setFormData({ ...formData, targetProjectId: e.target.value })}
                className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">选择项目</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">目标资源</label>
              <input
                type="text"
                placeholder="如: posts"
                value={formData.targetResource}
                onChange={(e) => setFormData({ ...formData, targetResource: e.target.value })}
                className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">字段映射</label>
            <textarea
              placeholder={`{\n  "sourceField": "targetField"\n}`}
              value={formData.mapping}
              onChange={(e) => setFormData({ ...formData, mapping: e.target.value })}
              className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              rows={6}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSubmit}>{editingLink ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
