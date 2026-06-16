import { useState, useEffect } from 'react'
import { Database, Download, Upload, Trash2, Clock, Calendar, Info } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { projectApi, crudApi, schemaApi } from '@/services/api'
import type { Project } from '@/types'

export function ProjectSettings() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [projectInfo, setProjectInfo] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  const [backupModalOpen, setBackupModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [schemas, setSchemas] = useState<any[]>([])
  const [backupProgress, setBackupProgress] = useState(0)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectApi.getAll()
        setProjects(response.data.data)
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      }
    }
    fetchProjects()
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    const fetchProjectInfo = async () => {
      setLoading(true)
      try {
        const response = await projectApi.getBySlug(selectedProject)
        setProjectInfo(response.data.data)
      } catch (err) {
        console.error('Failed to fetch project:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProjectInfo()

    const fetchSchemas = async () => {
      try {
        const response = await schemaApi.getAll(selectedProject)
        setSchemas(response.data.data)
      } catch (err) {
        console.error('Failed to fetch schemas:', err)
      }
    }
    fetchSchemas()
  }, [selectedProject])

  const handleBackup = async () => {
    setBackupProgress(0)
    setBackupModalOpen(true)
    
    const backup: any = {
      project: projectInfo,
      schemas: [],
      data: {},
      exportedAt: new Date().toISOString(),
    }

    try {
      setBackupProgress(20)
      const schemasResponse = await schemaApi.getAll(selectedProject)
      backup.schemas = schemasResponse.data.data
      
      setBackupProgress(40)
      for (const schema of backup.schemas) {
        try {
          const dataResponse = await crudApi.list(selectedProject, schema.name, { page: 1, page_size: 1000 })
          // 处理不同的响应格式
          const responseData = dataResponse.data as any
          backup.data[schema.name] = responseData.data && responseData.meta 
            ? responseData.data 
            : (responseData.data?.items || responseData.items || [])
        } catch (err) {
          console.error(`Failed to backup ${schema.name}:`, err)
          backup.data[schema.name] = []
        }
      }

      setBackupProgress(80)
      setBackupProgress(100)

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedProject}_backup_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Backup failed:', err)
      alert('备份失败')
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    
    setLoading(true)
    try {
      const text = await importFile.text()
      const backup = JSON.parse(text)
      
      for (const schema of backup.schemas) {
        try {
          await schemaApi.create(selectedProject, {
            name: schema.name,
            display_name: schema.display_name,
            definition: schema.definition,
          })
        } catch (err) {
          console.log(`Schema ${schema.name} already exists or failed to create`)
        }
      }

      for (const [resourceName, items] of Object.entries(backup.data)) {
        const itemArray = items as any[]
        for (const item of itemArray) {
          try {
            const itemData = { ...item }
            delete itemData.id
            delete itemData.created_at
            delete itemData.updated_at
            await crudApi.create(selectedProject, resourceName, itemData)
          } catch (err) {
            console.error(`Failed to import ${resourceName}:`, err)
          }
        }
      }

      alert('导入成功')
      setImportModalOpen(false)
      setImportFile(null)
    } catch (err) {
      console.error('Import failed:', err)
      alert('导入失败')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('确定要重置该项目的所有数据吗？这将删除所有数据但保留Schema定义。')) {
      return
    }

    setLoading(true)
    try {
      for (const schema of schemas) {
        try {
          const dataResponse = await crudApi.list(selectedProject, schema.name, { page: 1, page_size: 1000 })
          // 处理不同的响应格式
          const responseData = dataResponse.data as any
          const items = responseData.data && responseData.meta 
            ? responseData.data 
            : (responseData.data?.items || responseData.items || [])
          for (const item of items as any[]) {
            await crudApi.delete(selectedProject, schema.name, item.id)
          }
        } catch (err) {
          console.error(`Failed to delete ${schema.name} data:`, err)
        }
      }
      alert('重置成功')
    } catch (err) {
      console.error('Reset failed:', err)
      alert('重置失败')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">项目数据库管理</h1>
          <p className="text-text-secondary mt-1">管理项目的数据库设置、备份和导入</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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

        <Card className="lg:col-span-3">
          {projectInfo && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">{projectInfo.name}</h2>
                  <p className="text-text-secondary mt-1">{projectInfo.description || '暂无描述'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={handleReset} disabled={loading}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    重置数据
                  </Button>
                  <Button variant="secondary" onClick={() => setImportModalOpen(true)} disabled={loading}>
                    <Upload className="w-4 h-4 mr-2" />
                    导入数据
                  </Button>
                  <Button onClick={handleBackup} disabled={loading}>
                    <Download className="w-4 h-4 mr-2" />
                    备份数据
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-bg-hover rounded-lg">
                  <div className="flex items-center gap-2 text-text-muted mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">创建时间</span>
                  </div>
                  <p className="text-text-primary font-medium">{formatDate(projectInfo.created_at)}</p>
                </div>
                <div className="p-4 bg-bg-hover rounded-lg">
                  <div className="flex items-center gap-2 text-text-muted mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">更新时间</span>
                  </div>
                  <p className="text-text-primary font-medium">{formatDate(projectInfo.updated_at)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-4">Schema列表</h3>
                <div className="space-y-3">
                  {schemas.map((schema) => (
                    <div key={schema.id} className="p-4 bg-bg-hover rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text-primary">{schema.display_name}</p>
                          <p className="text-sm text-text-muted font-mono">{schema.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-text-muted">字段数: {schema.definition.fields?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!projectInfo && (
            <div className="text-center py-12 text-text-muted">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>请选择项目</p>
            </div>
          )}
        </Card>
      </div>

      <Modal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        title="备份数据"
        size="md"
      >
        <div className="space-y-4">
          {backupProgress > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">备份进度</span>
                <span className="text-sm text-text-primary">{backupProgress}%</span>
              </div>
              <div className="w-full h-2 bg-bg-hover rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${backupProgress}%` }}
                />
              </div>
            </div>
          )}
          {backupProgress === 100 && (
            <div className="flex items-center gap-2 text-success">
              <Info className="w-4 h-4" />
              <span>备份完成，文件已下载</span>
            </div>
          )}
          {backupProgress === 0 && (
            <p className="text-text-secondary">点击"备份数据"按钮开始备份项目数据。备份文件将包含所有Schema定义和数据。</p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setBackupModalOpen(false)} disabled={backupProgress > 0 && backupProgress < 100}>
              关闭
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false)
          setImportFile(null)
        }}
        title="导入数据"
        size="md"
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="hidden"
              id="import-file"
            />
            <label htmlFor="import-file" className="cursor-pointer">
              <Upload className="w-10 h-10 mx-auto mb-3 text-text-muted" />
              <p className="text-text-primary font-medium">点击选择备份文件</p>
              <p className="text-sm text-text-muted mt-1">支持 .json 格式</p>
            </label>
          </div>
          {importFile && (
            <div className="flex items-center justify-between p-3 bg-bg-hover rounded-lg">
              <span className="text-text-primary">{importFile.name}</span>
              <button
                onClick={() => setImportFile(null)}
                className="text-text-muted hover:text-danger transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setImportModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleImport} disabled={!importFile || loading}>
              {loading ? '导入中...' : '开始导入'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}