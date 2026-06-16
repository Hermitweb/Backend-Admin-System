import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Database, RefreshCw, Settings, ChevronDown, ChevronUp, Type, Hash, List, Calendar, CheckSquare, FileJson, Link2, Upload, ListOrdered } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { Input } from '@/components/common/Input'
import { projectApi, schemaApi } from '@/services/api'
import type { Project, ResourceSchema } from '@/types'

const FIELD_TYPES = [
  { type: 'string', label: '文本', icon: Type, description: '有限长度文本' },
  { type: 'text', label: '长文本', icon: List, description: '长文本内容' },
  { type: 'rich_text', label: '富文本', icon: FileJson, description: '富文本编辑器' },
  { type: 'integer', label: '整数', icon: Hash, description: '整数数字' },
  { type: 'decimal', label: '小数', icon: Hash, description: '精确小数' },
  { type: 'boolean', label: '布尔', icon: CheckSquare, description: '开关状态' },
  { type: 'enum', label: '枚举', icon: ListOrdered, description: '选项列表' },
  { type: 'timestamp', label: '时间戳', icon: Calendar, description: '日期时间' },
  { type: 'date', label: '日期', icon: Calendar, description: '日期' },
  { type: 'json', label: 'JSON', icon: FileJson, description: 'JSON对象' },
  { type: 'relation', label: '关联', icon: Link2, description: '关联关系' },
  { type: 'file', label: '文件', icon: Upload, description: '文件上传' },
  { type: 'array', label: '数组', icon: List, description: '数组类型' },
]

interface FieldConfig {
  name: string
  label: string
  type: string
  required?: boolean
  default?: any
  options?: string[]
  min?: number
  max?: number
  searchable?: boolean
  filterable?: boolean
}

export function Schemas() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [schemas, setSchemas] = useState<ResourceSchema[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSchema, setEditingSchema] = useState<ResourceSchema | null>(null)
  const [schemaName, setSchemaName] = useState('')
  const [schemaLabel, setSchemaLabel] = useState('')
  const [fields, setFields] = useState<FieldConfig[]>([])
  const [expandedField, setExpandedField] = useState<string | null>(null)
  const [selectedFieldType, setSelectedFieldType] = useState('string')

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectApi.getAll()
        const responseData = response.data as any
        const projectList = responseData && responseData.data ? responseData.data : []
        setProjects(Array.isArray(projectList) ? projectList : [])
        if (projectList.length > 0) {
          setSelectedProject(projectList[0].slug)
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err)
        setProjects([])
      }
    }
    fetchProjects()
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    const fetchSchemas = async () => {
      setLoading(true)
      try {
        const response = await schemaApi.getAll(selectedProject)
        const responseData = response.data as any
        const schemaList = responseData && responseData.data ? responseData.data : []
        setSchemas(Array.isArray(schemaList) ? schemaList : [])
      } catch (err) {
        console.error('Failed to fetch schemas:', err)
        setSchemas([])
      } finally {
        setLoading(false)
      }
    }
    fetchSchemas()
  }, [selectedProject])

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

  const handleOpenModal = (schema?: ResourceSchema) => {
    if (schema) {
      setEditingSchema(schema)
      setSchemaName(schema.name)
      setSchemaLabel(schema.display_name)
      const def = parseDefinition(schema.definition)
      setFields((def.fields as any[]) || [])
    } else {
      setEditingSchema(null)
      setSchemaName('')
      setSchemaLabel('')
      setFields([])
    }
    setModalOpen(true)
  }

  const handleAddField = () => {
    const newField: FieldConfig = {
      name: '',
      label: '',
      type: selectedFieldType,
      required: false,
      searchable: false,
      filterable: false,
    }
    setFields([...fields, newField])
    setExpandedField(String(fields.length))
  }

  const handleUpdateField = (index: number, updates: Partial<FieldConfig>) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFields(newFields)
  }

  const handleDeleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const handleReorderField = (fromIndex: number, toIndex: number) => {
    const newFields = [...fields]
    const [removed] = newFields.splice(fromIndex, 1)
    newFields.splice(toIndex, 0, removed)
    setFields(newFields)
  }

  const handleSubmit = async () => {
    if (!selectedProject || !schemaName) return
    
    const definitionData = {
      fields: fields.map(f => ({
        name: f.name,
        type: f.type,
        label: f.label,
        required: f.required,
        default: f.default,
        options: f.type === 'enum' ? f.options : undefined,
        min: f.min,
        max: f.max,
        searchable: f.searchable,
        filterable: f.filterable,
      })),
    }

    try {
      if (editingSchema) {
        await schemaApi.update(selectedProject, editingSchema.id, { display_name: schemaLabel, definition: definitionData })
      } else {
        await schemaApi.create(selectedProject, { name: schemaName, display_name: schemaLabel, definition: definitionData })
      }
      setModalOpen(false)
      await schemaApi.getAll(selectedProject).then(res => {
        const responseData = res.data as any
        const schemaList = responseData && responseData.data ? responseData.data : []
        setSchemas(Array.isArray(schemaList) ? schemaList : [])
      })
    } catch (err) {
      console.error('Failed to save schema:', err)
      alert('保存失败')
    }
  }

  const handleDelete = async (id: string) => {
    if (!selectedProject) return
    if (confirm('确定要删除这个Schema吗？')) {
      try {
        await schemaApi.delete(selectedProject, id)
        await schemaApi.getAll(selectedProject).then(res => {
          const responseData = res.data as any
          const schemaList = responseData && responseData.data ? responseData.data : []
          setSchemas(Array.isArray(schemaList) ? schemaList : [])
        })
      } catch (err) {
        console.error('Failed to delete schema:', err)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Schema管理</h1>
          <p className="text-text-secondary mt-1">管理项目的数据资源定义</p>
        </div>
        <Button onClick={() => handleOpenModal()} disabled={!selectedProject}>
          <Plus className="w-4 h-4" />
          新建Schema
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-text-primary mb-4">选择项目</h3>
          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project.slug)}
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
                <span className="text-xs opacity-70">{project.slug}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">
              {selectedProject ? `${selectedProject} 的 Schema 列表` : '请选择项目'}
            </h3>
            <Button variant="secondary" onClick={() => selectedProject && schemaApi.getAll(selectedProject).then(res => {
          const responseData = res.data as any
          const schemaList = responseData && responseData.data ? responseData.data : []
          setSchemas(Array.isArray(schemaList) ? schemaList : [])
        })} loading={loading}>
              <RefreshCw className="w-4 h-4" />
              刷新
            </Button>
          </div>

          <div className="space-y-3">
            {schemas.length > 0 ? (
              schemas.map((schema) => (
                <div 
                  key={schema.id}
                  className="p-4 bg-bg-hover rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text-primary">{schema.display_name}</p>
                      <p className="text-sm text-text-muted font-mono">{schema.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(schema)}
                        className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(schema.id)}
                        className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {((parseDefinition(schema.definition).fields as any[]) || []).map((field: any) => (
                      <span 
                        key={field.name}
                        className="px-2 py-1 bg-bg-card rounded text-xs text-text-muted border border-border"
                      >
                        {field.label || field.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-text-muted">
                <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无Schema数据</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingSchema(null)
        }}
        title={editingSchema ? '编辑Schema' : '新建Schema'}
        size="xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Schema名称"
              placeholder="英文标识，如 article"
              value={schemaName}
              onChange={(e) => setSchemaName(e.target.value)}
              disabled={!!editingSchema}
            />
            <Input
              label="显示标签"
              placeholder="中文显示名，如 文章"
              value={schemaLabel}
              onChange={(e) => setSchemaLabel(e.target.value)}
            />
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-text-primary">字段列表</h4>
              <div className="flex items-center gap-2">
                <select
                  value={selectedFieldType}
                  onChange={(e) => setSelectedFieldType(e.target.value)}
                  className="px-3 py-1.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft.type} value={ft.type}>{ft.label}</option>
                  ))}
                </select>
                <Button size="sm" onClick={handleAddField}>
                  <Plus className="w-4 h-4" />
                  添加字段
                </Button>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {fields.length > 0 ? (
                fields.map((field, index) => {
                  const FieldIcon = FIELD_TYPES.find(f => f.type === field.type)?.icon || Type
                  return (
                    <div 
                      key={index}
                      className="border border-border rounded-lg overflow-hidden"
                    >
                      <div 
                        className="flex items-center justify-between px-4 py-3 bg-bg-hover cursor-pointer"
                        onClick={() => setExpandedField(expandedField === String(index) ? null : String(index))}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-lg">
                            <FieldIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">
                              {field.label || field.name || '未命名字段'}
                            </p>
                            <p className="text-xs text-text-muted">
                              {FIELD_TYPES.find(f => f.type === field.type)?.label || field.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (index > 0) handleReorderField(index, index - 1)
                            }}
                            className="p-1 text-text-muted hover:text-primary"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (index < fields.length - 1) handleReorderField(index, index + 1)
                            }}
                            className="p-1 text-text-muted hover:text-primary"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteField(index)
                            }}
                            className="p-1 text-text-muted hover:text-danger"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {expandedField === String(index) && (
                        <div className="p-4 bg-bg-card border-t border-border space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <Input
                              label="字段名"
                              placeholder="字段标识，如 title"
                              value={field.name}
                              onChange={(e) => handleUpdateField(index, { name: e.target.value })}
                            />
                            <Input
                              label="显示标签"
                              placeholder="中文显示名"
                              value={field.label}
                              onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                            />
                          </div>

                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.required || false}
                                onChange={(e) => handleUpdateField(index, { required: e.target.checked })}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                              />
                              <span className="text-sm text-text-secondary">必填</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.searchable || false}
                                onChange={(e) => handleUpdateField(index, { searchable: e.target.checked })}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                              />
                              <span className="text-sm text-text-secondary">可搜索</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.filterable || false}
                                onChange={(e) => handleUpdateField(index, { filterable: e.target.checked })}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                              />
                              <span className="text-sm text-text-secondary">可筛选</span>
                            </label>
                          </div>

                          {field.type === 'enum' && (
                            <div>
                              <label className="block text-sm font-medium text-text-primary mb-2">
                                枚举选项（每行一个）
                              </label>
                              <textarea
                                placeholder="draft
published
archived"
                                value={field.options?.join('\n') || ''}
                                onChange={(e) => handleUpdateField(index, { options: e.target.value.split('\n').filter(Boolean) })}
                                className="w-full px-4 py-2.5 bg-bg-hover border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                rows={3}
                              />
                            </div>
                          )}

                          {(field.type === 'integer' || field.type === 'decimal') && (
                            <div className="grid grid-cols-2 gap-4">
                              <Input
                                label="最小值"
                                type="number"
                                value={field.min || ''}
                                onChange={(e) => handleUpdateField(index, { min: Number(e.target.value) })}
                              />
                              <Input
                                label="最大值"
                                type="number"
                                value={field.max || ''}
                                onChange={(e) => handleUpdateField(index, { max: Number(e.target.value) })}
                              />
                            </div>
                          )}

                          {field.type === 'relation' && (
                            <Input
                              label="关联资源"
                              placeholder="目标资源名称"
                              value={field.default || ''}
                              onChange={(e) => handleUpdateField(index, { default: e.target.value })}
                            />
                          )}

                          <Input
                            label="默认值"
                            placeholder="可选的默认值"
                            value={field.default || ''}
                            onChange={(e) => handleUpdateField(index, { default: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-text-muted">
                  <Settings className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>暂无字段，请添加</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSubmit}>{editingSchema ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}