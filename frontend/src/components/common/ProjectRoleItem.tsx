import { memo } from 'react'
import { FolderKanban, X } from 'lucide-react'
import type { Project } from '@/types'

type ProjectRole = 'admin' | 'editor' | 'viewer'

interface ProjectRoleItemProps {
  project: Project
  currentRole?: ProjectRole
  onRoleChange: (projectId: string, role: ProjectRole) => void
  onRemove: (projectId: string) => void
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

export const ProjectRoleItem = memo(function ProjectRoleItem({ 
  project, 
  currentRole, 
  onRoleChange, 
  onRemove 
}: ProjectRoleItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-bg-hover rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <FolderKanban className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-text-primary">{project.name}</p>
          <p className="text-xs text-text-muted">{project.slug}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {(['admin', 'editor', 'viewer'] as ProjectRole[]).map((role) => (
          <button
            key={role}
            onClick={() => onRoleChange(project.id, role)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
              currentRole === role
                ? getProjectRoleColor(role) + ' border'
                : 'bg-white text-text-secondary border border-border hover:bg-bg-hover'
            }`}
          >
            {getProjectRoleLabel(role)}
          </button>
        ))}
        {currentRole && (
          <button
            onClick={() => onRemove(project.id)}
            className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-md"
            title="移除"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
})
