import { useState, useEffect } from 'react'
import { FileText, Copy, Check, RefreshCw } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { projectApi, docApi } from '@/services/api'
import type { Project } from '@/types'

export function Docs() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [docs, setDocs] = useState<Record<string, unknown> | null>(null)
  const [format, setFormat] = useState<'json' | 'yaml'>('json')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectApi.getAll()
        const projectList = response.data.data
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
    const fetchDocs = async () => {
      setLoading(true)
      try {
        const response = await docApi.getOpenApiJson(selectedProject)
        setDocs(response.data)
      } catch (err) {
        console.error('Failed to fetch docs:', err)
        setDocs(null)
      } finally {
        setLoading(false)
      }
    }
    fetchDocs()
  }, [selectedProject])

  const handleCopy = () => {
    if (!docs) return
    const content = format === 'json' 
      ? JSON.stringify(docs, null, 2)
      : JSON.stringify(docs, null, 2)
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!docs) return
    const content = format === 'json' 
      ? JSON.stringify(docs, null, 2)
      : JSON.stringify(docs, null, 2)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `openapi.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">API文档</h1>
          <p className="text-text-secondary mt-1">查看和下载项目的OpenAPI文档</p>
        </div>
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
                  <FileText className="w-4 h-4" />
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
              {selectedProject ? `${selectedProject} 的 OpenAPI 文档` : '请选择项目'}
            </h3>
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                onClick={() => setFormat(format === 'json' ? 'yaml' : 'json')}
                size="sm"
              >
                {format === 'json' ? 'JSON' : 'YAML'}
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleCopy} 
                size="sm"
                disabled={!docs}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制'}
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleDownload} 
                size="sm"
                disabled={!docs}
              >
                下载
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => selectedProject && docApi.getOpenApiJson(selectedProject).then(res => setDocs(res.data))} 
                loading={loading}
                size="sm"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {docs ? (
            <pre className="p-4 bg-slate-900 text-green-400 rounded-lg text-sm font-mono overflow-x-auto max-h-[600px] overflow-y-auto">
              {format === 'json' ? JSON.stringify(docs, null, 2) : JSON.stringify(docs, null, 2)}
            </pre>
          ) : (
            <div className="text-center py-12 text-text-muted">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{loading ? '加载中...' : '暂无文档数据'}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
