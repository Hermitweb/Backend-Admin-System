import { useState, useEffect } from 'react'
import { 
  Database, Plus, Edit, Trash2, ExternalLink, Settings, RefreshCw, Check, X,
  Grid3X3, Layers, Network, Clock, Search, Cloud, Cpu, Brain, Box
} from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { projectApi } from '@/services/api'
import { databaseApi, type DatabaseConnection as DbConnection, type CreateDatabaseConnectionDto } from '@/services/databaseApi'
import type { Project } from '@/types'

type DatabaseType = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'redis' | 'elasticsearch' | 'influxdb' | 'neo4j' | 'cassandra' | 'cockroachdb' | 'tidb' | 'milvus' | 'arangodb'

interface DatabaseCategory {
  id: string
  name: string
  category: string
  description: string
  products: string[]
  icon: typeof Database
  color: string
}

export function DatabaseManager() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [connections, setConnections] = useState<DbConnection[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<DbConnection | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'postgresql' as DatabaseType,
    host: '',
    port: 5432,
    database: '',
    username: '',
    password: '',
  })

  const databaseCategories: DatabaseCategory[] = [
    { id: 'sql', name: '关系型数据库', category: 'SQL', description: '数据存储在表格中，支持严格的一致性（ACID）和复杂的SQL查询。', products: ['MySQL', 'PostgreSQL', 'Oracle', 'SQL Server', 'SQLite'], icon: Grid3X3, color: '#6366f1' },
    { id: 'keyvalue', name: '键值存储', category: 'NoSQL', description: '基于Key-Value对，访问速度快，非常适合做缓存。', products: ['Redis', 'Memcached'], icon: Box, color: '#8b5cf6' },
    { id: 'document', name: '文档数据库', category: 'NoSQL', description: '存储JSON或BSON格式的文档，数据模式灵活，适合快速迭代。', products: ['MongoDB', 'CouchDB'], icon: Layers, color: '#ec4899' },
    { id: 'column', name: '列族数据库', category: 'NoSQL', description: '按列存储，擅长处理海量数据的写入和分析型查询。', products: ['Cassandra', 'HBase'], icon: Layers, color: '#f59e0b' },
    { id: 'graph', name: '图数据库', category: 'NoSQL', description: '以节点和边的图结构存储，擅长处理复杂的关系网络。', products: ['Neo4j', 'JanusGraph', 'Amazon Neptune'], icon: Network, color: '#10b981' },
    { id: 'timeseries', name: '时序数据库', category: 'TSDB', description: '专门优化处理带有时间戳的数据，写入和查询效率极高。', products: ['InfluxDB', 'TimescaleDB'], icon: Clock, color: '#06b6d4' },
    { id: 'search', name: '搜索数据库', category: 'Search', description: '基于倒排索引，提供强大的全文搜索和分析能力。', products: ['Elasticsearch'], icon: Search, color: '#f97316' },
    { id: 'cloud', name: '云原生数据库', category: 'Cloud', description: '专为云环境设计，具备计算存储分离、Serverless等特性。', products: ['AWS RDS/Aurora', 'PolarDB', 'Snowflake'], icon: Cloud, color: '#3b82f6' },
    { id: 'memory', name: '内存数据库', category: 'In-Memory', description: '将数据主要存储在内存中，追求极致的读写速度。', products: ['Redis', 'Memcached', 'Hazelcast'], icon: Cpu, color: '#84cc16' },
    { id: 'vector', name: '向量数据库', category: 'Vector', description: '专门存储和检索向量数据，是AI和大模型应用的关键组件。', products: ['Milvus', 'Chroma', 'Pinecone'], icon: Brain, color: '#a855f7' },
    { id: 'multi', name: '多模数据库', category: 'Multi-Model', description: '一个数据库引擎同时支持多种数据模型（如文档、图、键值）。', products: ['ArangoDB', 'OrientDB'], icon: Layers, color: '#0ea5e9' },
    { id: 'embedded', name: '嵌入式数据库', category: 'Embedded', description: '轻量级，直接嵌入到应用程序中运行，无需独立服务。', products: ['SQLite', 'Realm', 'RocksDB'], icon: Box, color: '#22c55e' },
    { id: 'newsql', name: 'NewSQL数据库', category: 'NewSQL', description: '结合了NoSQL的水平扩展性和传统SQL的ACID事务特性。', products: ['Google Spanner', 'CockroachDB', 'TiDB'], icon: Grid3X3, color: '#ef4444' },
    { id: 'warehouse', name: '数据仓库', category: 'Warehouse', description: '用于大规模分析和商业智能（BI），优化了复杂查询性能。', products: ['Amazon Redshift', 'Google BigQuery', 'Snowflake'], icon: Database, color: '#64748b' },
  ]

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectApi.getAll()
        const responseData = response.data as any
        let projectList: Project[] = []
        if (responseData && responseData.data) {
          projectList = responseData.data as Project[]
        } else if (Array.isArray(responseData)) {
          projectList = responseData as Project[]
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
    fetchConnections()
  }, [selectedProject])

  const fetchConnections = async () => {
    setLoading(true)
    try {
      const response = await databaseApi.list(selectedProject)
      const responseData = response.data as any
      setConnections(responseData && responseData.data ? responseData.data : responseData || [])
    } catch (err) {
      console.error('Failed to fetch connections:', err)
      setConnections([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (connection?: DbConnection) => {
    if (connection) {
      setEditingConnection(connection)
      setFormData({
        name: connection.name,
        type: connection.type as DatabaseType,
        host: connection.host,
        port: connection.port || 5432,
        database: connection.database,
        username: connection.username || '',
        password: '',
      })
    } else {
      setEditingConnection(null)
      setFormData({
        name: '',
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: '',
        username: '',
        password: '',
      })
    }
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.host || !formData.database) {
      alert('请填写必填字段')
      return
    }

    const dto: CreateDatabaseConnectionDto = {
      name: formData.name,
      type: formData.type,
      host: formData.host,
      database: formData.database,
    }

    if (formData.port) dto.port = formData.port
    if (formData.username) dto.username = formData.username
    if (formData.password) dto.password = formData.password

    try {
      if (editingConnection) {
        await databaseApi.update(selectedProject, editingConnection.id, dto)
      } else {
        await databaseApi.create(selectedProject, dto)
      }

      setModalOpen(false)
      setEditingConnection(null)
      await fetchConnections()
      alert(editingConnection ? '连接信息已更新' : '连接已创建')
    } catch (err) {
      console.error('Failed to save connection:', err)
      alert('保存失败，请重试')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个数据库连接吗？')) {
      return
    }

    try {
      await databaseApi.delete(selectedProject, id)
      await fetchConnections()
    } catch (err) {
      console.error('Failed to delete connection:', err)
      alert('删除失败，请重试')
    }
  }

  const handleTestConnection = async (connection: DbConnection) => {
    try {
      const response = await databaseApi.test(selectedProject, connection.id)
      const responseData = response.data as any
      const result = responseData && responseData.data ? responseData.data : responseData
      
      setConnections(prev => prev.map(c => 
        c.id === connection.id 
          ? { ...c, status: result.success ? 'connected' : 'error', last_error: result.success ? null : result.message }
          : c
      ))
      
      alert(result.success ? '连接测试成功！' : `连接测试失败: ${result.message}`)
    } catch (err) {
      console.error('Failed to test connection:', err)
      alert('测试连接失败，请重试')
    }
  }

  const handleRefreshStatus = async () => {
    try {
      const response = await databaseApi.refresh(selectedProject)
      const responseData = response.data as any
      setConnections(responseData && responseData.data ? responseData.data : responseData || [])
    } catch (err) {
      console.error('Failed to refresh status:', err)
      alert('刷新状态失败，请重试')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Check className="w-4 h-4 text-success" />
      case 'disconnected': return <X className="w-4 h-4 text-warning" />
      case 'error': return <X className="w-4 h-4 text-danger" />
      default: return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return '已连接'
      case 'disconnected': return '未连接'
      case 'error': return '连接错误'
      default: return status
    }
  }

  const getTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      postgresql: 'PostgreSQL',
      mysql: 'MySQL',
      sqlite: 'SQLite',
      mongodb: 'MongoDB',
      redis: 'Redis',
      elasticsearch: 'Elasticsearch',
      influxdb: 'InfluxDB',
      neo4j: 'Neo4j',
      cassandra: 'Cassandra',
      cockroachdb: 'CockroachDB',
      tidb: 'TiDB',
      milvus: 'Milvus',
      arangodb: 'ArangoDB',
    }
    return typeMap[type] || type
  }

  const getDefaultPort = (type: DatabaseType) => {
    const portMap: Record<DatabaseType, number> = {
      postgresql: 5432,
      mysql: 3306,
      sqlite: 0,
      mongodb: 27017,
      redis: 6379,
      elasticsearch: 9200,
      influxdb: 8086,
      neo4j: 7474,
      cassandra: 9042,
      cockroachdb: 26257,
      tidb: 4000,
      milvus: 19530,
      arangodb: 8529,
    }
    return portMap[type] || 5432
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">数据库管理</h1>
          <p className="text-text-secondary mt-1">管理项目的数据库连接信息、链接和设置</p>
        </div>
        <Button onClick={() => handleOpenModal()} disabled={!selectedProject}>
          <Plus className="w-4 h-4 mr-2" />
          添加数据库连接
        </Button>
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-semibold text-text-primary">数据库连接列表</h3>
              <span className="text-xs text-text-muted">{connections.length} 个连接</span>
            </div>
            <Button variant="secondary" onClick={handleRefreshStatus} loading={loading}>
              <RefreshCw className="w-4 h-4" />
              刷新状态
            </Button>
          </div>

          {selectedProject && connections.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connections.map((connection) => (
                <div 
                  key={connection.id} 
                  className="p-4 bg-bg-hover rounded-lg border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Database className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-text-primary">{connection.name}</h4>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                            {getTypeText(connection.type)}
                          </span>
                        </div>
                        <div className="mt-1.5 text-sm text-text-muted font-mono bg-bg-hover px-2 py-1 rounded border border-border/50 overflow-hidden text-ellipsis whitespace-nowrap">
                          {connection.host}:{connection.port} / {connection.database}
                        </div>
                        {connection.last_error && (
                          <div className="mt-2 text-xs text-danger">{connection.last_error}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center flex-shrink-0 pt-0.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${
                        connection.status === 'connected' 
                          ? 'bg-success/10 text-success' 
                          : connection.status === 'error' 
                            ? 'bg-danger/10 text-danger' 
                            : 'bg-warning/10 text-warning'
                      }`}>
                        {getStatusIcon(connection.status)}
                        {getStatusText(connection.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <button
                      onClick={() => handleTestConnection(connection)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-text-secondary hover:text-success hover:bg-success/10 rounded-lg transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      测试连接
                    </button>
                    <button
                      onClick={() => handleOpenModal(connection)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    >
                      <Edit className="w-4 h-4" />
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(connection.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedProject && connections.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>该项目暂无数据库连接</p>
              <Button variant="secondary" onClick={() => handleOpenModal()} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                添加连接
              </Button>
            </div>
          )}

          {!selectedProject && (
            <div className="text-center py-12 text-text-muted">
              <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>请选择项目</p>
            </div>
          )}
        </Card>
      </div>

      <Card title="数据库技术栈全景图">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {databaseCategories.map((category) => {
            const Icon = category.icon
            return (
              <div 
                key={category.id}
                className="p-4 rounded-lg border border-border hover:border-primary/30 transition-all bg-bg-hover"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${category.color}15` }}>
                    <Icon className="w-5 h-5" style={{ color: category.color }} />
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary text-sm">{category.name}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-text-muted/10 text-text-muted">{category.category}</span>
                  </div>
                </div>
                <p className="text-xs text-text-secondary mb-3 line-clamp-2">{category.description}</p>
                <div className="flex flex-wrap gap-1">
                  {category.products.map((product, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 rounded bg-bg-card border border-border text-text-muted">{product}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingConnection(null) }}
        title={editingConnection ? '编辑数据库连接' : '添加数据库连接'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">连接名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="输入连接名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">数据库类型 *</label>
            <select
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value as DatabaseType
                setFormData({ ...formData, type: newType, port: getDefaultPort(newType) })
              }}
              className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlite">SQLite</option>
              <option value="mongodb">MongoDB</option>
              <option value="redis">Redis</option>
              <option value="elasticsearch">Elasticsearch</option>
              <option value="influxdb">InfluxDB</option>
              <option value="neo4j">Neo4j</option>
              <option value="cassandra">Cassandra</option>
              <option value="cockroachdb">CockroachDB</option>
              <option value="tidb">TiDB</option>
              <option value="milvus">Milvus</option>
              <option value="arangodb">ArangoDB</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">主机地址 *</label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="localhost"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">端口</label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled={formData.type === 'sqlite'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">数据库名称 *</label>
              <input
                type="text"
                value={formData.database}
                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="database_name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">用户名</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">密码</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2.5 bg-bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="输入密码"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSubmit}>{editingConnection ? '保存修改' : '创建连接'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}