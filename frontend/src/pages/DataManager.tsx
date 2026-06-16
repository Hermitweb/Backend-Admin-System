import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, RefreshCw, Database, ChevronDown, ChevronUp, Filter, Grid3X3, List } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { projectApi, schemaApi, crudApi } from '@/services/api'
import type { Project, ResourceSchema } from '@/types'

export function DataManager() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [schemas, setSchemas] = useState<ResourceSchema[]>([])
  const [selectedSchema, setSelectedSchema] = useState<string>('')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectApi.getAll()
        let projectList: Project[] = []
        if (response.data && response.data.data) {
          projectList = response.data.data as Project[]
        } else if (response.data && Array.isArray(response.data)) {
          projectList = response.data as Project[]
        }
        setProjects(projectList)
        if (projectList.length > 0) {
          setSelectedProject(projectList[0].slug)
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      }
    }
    fetchProjects()
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    const fetchSchemas = async () => {
      try {
        const response = await schemaApi.getAll(selectedProject)
        // 处理不同的响应格式
        let schemasData: ResourceSchema[] = []
        if (response.data && response.data.data) {
          schemasData = response.data.data as ResourceSchema[]
        } else if (response.data && Array.isArray(response.data)) {
          schemasData = response.data as ResourceSchema[]
        }
        setSchemas(schemasData)
        if (schemasData.length > 0) {
          setSelectedSchema(schemasData[0].name)
        }
      } catch (err) {
        console.error('Failed to fetch schemas:', err)
      }
    }
    fetchSchemas()
  }, [selectedProject])

  useEffect(() => {
    if (!selectedProject || !selectedSchema) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await crudApi.list(selectedProject, selectedSchema, {
          page: pagination.page,
          page_size: pagination.limit,
        })
        // 处理不同的响应格式
        let itemsData: any[] = []
        let totalData = 0
        const responseData = response.data as any
        if (responseData && responseData.data && responseData.meta) {
          // 后端返回格式: { code, message, data: [...], meta: {...} }
          itemsData = responseData.data || []
          totalData = responseData.meta?.total || 0
        } else if (responseData && responseData.data && responseData.data.data && responseData.data.meta) {
          // 响应拦截器处理后的格式: { code, message, data: { data: [...], meta: {...} } }
          itemsData = responseData.data.data || []
          totalData = responseData.data.meta?.total || 0
        } else if (responseData && responseData.data) {
          itemsData = responseData.data.items || responseData.data || []
          totalData = responseData.data.total || 0
        } else if (responseData && responseData.items) {
          itemsData = responseData.items
          totalData = responseData.total || 0
        }
        setData(itemsData)
        setPagination(prev => ({ ...prev, total: totalData }))
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedProject, selectedSchema, pagination.page, pagination.limit])

  const getCurrentSchema = () => {
    return schemas.find(s => s.name === selectedSchema)
  }

  const parseDefinition = (definition: any): any => {
    if (!definition) return { fields: [] }
    if (typeof definition === 'string') {
      try {
        return JSON.parse(definition)
      } catch {
        return { fields: [] }
      }
    }
    return definition
  }

  const handleOpenModal = (item?: any) => {
    const schema = getCurrentSchema()
    const definition = parseDefinition(schema?.definition)
    const fields = Array.isArray(definition) ? definition : (definition?.fields || []) as any[]
    
    if (item) {
      setEditingItem(item)
      const initialData: Record<string, any> = {}
      fields.forEach((field: any) => {
        initialData[field.name] = item[field.name] ?? ''
      })
      setFormData(initialData)
    } else {
      setEditingItem(null)
      const initialData: Record<string, any> = {}
      fields.forEach((field: any) => {
        initialData[field.name] = field.default ?? ''
      })
      setFormData(initialData)
    }
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedProject || !selectedSchema) return

    try {
      if (editingItem) {
        await crudApi.update(selectedProject, selectedSchema, editingItem.id, formData)
      } else {
        await crudApi.create(selectedProject, selectedSchema, formData)
      }
      setModalOpen(false)
      setEditingItem(null)
      setFormData({})
      await fetchData()
    } catch (err) {
      console.error('Failed to save data:', err)
      alert('保存失败')
    }
  }

  const handleDelete = async (id: string) => {
    if (!selectedProject || !selectedSchema) return
    if (confirm('确定要删除这条数据吗？')) {
      try {
        await crudApi.delete(selectedProject, selectedSchema, id)
        await fetchData()
      } catch (err) {
        console.error('Failed to delete data:', err)
      }
    }
  }

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    // 简单的前端搜索过滤
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > Math.ceil(pagination.total / pagination.limit)) return
    setPagination(prev => ({ ...prev, page }))
  }

  const handleLimitChange = (limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }))
  }

  const renderField = (field: any, value: any) => {
    switch (field.type) {
      case 'boolean':
        return value ? '是' : '否'
      case 'timestamp':
      case 'date':
        return value ? new Date(value).toLocaleString('zh-CN') : '-'
      case 'json':
      case 'array':
        try {
          const parsed = typeof value === 'string' ? JSON.parse(value) : value
          const str = Array.isArray(parsed) ? parsed.join(', ') : JSON.stringify(parsed)
          return str.length > 50 ? str.substring(0, 50) + '...' : str
        } catch {
          const str = String(value)
          return str.length > 50 ? str.substring(0, 50) + '...' : str
        }
      default:
        const str = String(value ?? '-')
        return str.length > 50 ? str.substring(0, 50) + '...' : str
    }
  }

  const renderFormField = (field: any) => {
    const value = formData[field.name] ?? ''
    
    switch (field.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <span className="text-sm text-text-secondary">启用</span>
          </label>
        )
      case 'integer':
      case 'decimal':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.name]: Number(e.target.value) })}
            className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        )
      case 'text':
        return (
          <textarea
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            rows={4}
          />
        )
      case 'enum':
        return (
          <select
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">请选择</option>
            {field.options?.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )
      default:
        return (
          <input
            type={field.type === 'email' ? 'email' : 'text'}
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
            className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder={field.label}
          />
        )
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await crudApi.list(selectedProject, selectedSchema, {
        page: pagination.page,
        page_size: pagination.limit,
      })
      // 处理不同的响应格式
      let itemsData: any[] = []
      let totalData = 0
      const responseData = response.data as any
      if (responseData && responseData.data && responseData.meta) {
        // 后端返回格式: { code, message, data: [...], meta: {...} }
        itemsData = responseData.data || []
        totalData = responseData.meta?.total || 0
      } else if (responseData && responseData.data && responseData.data.data && responseData.data.meta) {
        // 响应拦截器处理后的格式: { code, message, data: { data: [...], meta: {...} } }
        itemsData = responseData.data.data || []
        totalData = responseData.data.meta?.total || 0
      } else if (responseData && responseData.data) {
        itemsData = responseData.data.items || responseData.data || []
        totalData = responseData.data.total || 0
      } else if (responseData && responseData.items) {
        itemsData = responseData.items
        totalData = responseData.total || 0
      }
      setData(itemsData)
      setPagination(prev => ({ ...prev, total: totalData }))
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const currentSchema = getCurrentSchema()
  const definition = parseDefinition(currentSchema?.definition)
  const fields = Array.isArray(definition) ? definition : (definition?.fields || []) as any[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">数据管理</h1>
          <p className="text-text-secondary mt-1">查看和管理项目中的具体数据</p>
        </div>
        <Button onClick={() => handleOpenModal()} disabled={!selectedSchema}>
          <Plus className="w-4 h-4 mr-2" />
          添加数据
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-text-primary mb-4">选择项目</h3>
          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  setSelectedProject(project.slug)
                  setSelectedSchema('')
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  selectedProject === project.slug
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-bg-hover hover:bg-border text-text-secondary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span className="font-medium">{project.name}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedSchema}
                onChange={(e) => {
                  setSelectedSchema(e.target.value)
                  setPagination({ page: 1, limit: 10, total: 0 })
                }}
                className="w-full sm:w-auto px-3 py-2 bg-bg-hover border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">请选择数据资源</option>
                {schemas.map((schema) => (
                  <option key={schema.id} value={schema.name}>
                    {schema.display_name || schema.name}
                  </option>
                ))}
              </select>
              <div className="relative w-full sm:w-auto">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full sm:w-40 pl-9 pr-3 py-2 bg-bg-hover border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-secondary">每页:</span>
                <select
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="px-2.5 py-1.5 bg-bg-hover border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-1 bg-bg-hover rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'list' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${
                    viewMode === 'grid' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                </button>
              </div>
              <Button variant="secondary" size="sm" onClick={fetchData} loading={loading}>
                <RefreshCw className="w-3.5 h-3.5" />
                刷新
              </Button>
            </div>
          </div>

          {selectedSchema && (
            <>
              {viewMode === 'list' ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="bg-bg-hover">
                        {fields.map((field: any) => (
                          <th 
                            key={field.name} 
                            className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary whitespace-nowrap"
                            style={{ minWidth: field.type === 'boolean' ? '60px' : field.type === 'number' ? '80px' : '120px' }}
                          >
                            {field.label || field.name}
                          </th>
                        ))}
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary whitespace-nowrap w-20">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.map((item) => (
                        <tr key={item.id} className="hover:bg-bg-hover/50 transition-colors">
                          {fields.map((field: any) => (
                            <td key={field.name} className="px-3 py-2 text-text-secondary text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                              {renderField(field, item[field.name])}
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenModal(item)}
                                className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded transition-all"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.length === 0 && (
                    <div className="text-center py-12 text-text-muted">
                      <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>暂无数据</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {data.map((item) => (
                    <div key={item.id} className="p-4 bg-bg-hover rounded-lg border border-border">
                      {fields.slice(0, 4).map((field: any) => (
                        <div key={field.name} className="mb-2">
                          <p className="text-xs text-text-muted">{field.label || field.name}</p>
                          <p className="text-sm text-text-primary truncate">{String(renderField(field, item[field.name]))}</p>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {data.length === 0 && (
                    <div className="col-span-full text-center py-12 text-text-muted">
                      <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>暂无数据</p>
                    </div>
                  )}
                </div>
              )}

              {data.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-text-secondary">
                    显示第 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 条，共 {pagination.total} 条
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="w-7 h-7 p-0"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                    {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pagination.limit)) }, (_, i) => {
                      const pageNum = i + 1
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === pagination.page ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className={`w-7 h-7 p-0 ${pageNum === pagination.page ? 'text-white' : ''}`}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                      className="w-7 h-7 p-0"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {!selectedSchema && (
            <div className="text-center py-12 text-text-muted">
              <Filter className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>请选择数据资源</p>
            </div>
          )}
        </Card>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingItem(null)
          setFormData({})
        }}
        title={editingItem ? '编辑数据' : '添加数据'}
        size="lg"
      >
        {currentSchema && (
          <div className="space-y-4">
            {fields.map((field: any) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  {field.label || field.name}
                  {field.required && <span className="text-danger ml-1">*</span>}
                </label>
                {renderFormField(field)}
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
              <Button onClick={handleSubmit}>{editingItem ? '保存' : '创建'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}