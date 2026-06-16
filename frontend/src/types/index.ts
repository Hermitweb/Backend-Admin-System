export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface User {
  id: string
  email: string
  name: string
  avatar: string | null
  status: 'active' | 'inactive'
  role: 'super_admin' | 'admin' | 'user'
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  slug: string
  name: string
  description: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface ResourceSchema {
  id: string
  project_id: string
  name: string
  display_name: string
  definition: Record<string, unknown>
  version: number
  created_at: string
  updated_at: string
}

export interface LinkRule {
  id: string
  sourceProjectId: string
  targetProjectId: string
  sourceResource: string
  targetResource: string
  mapping: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  email: string
  password: string
  name: string
}

export interface CreateProjectDto {
  slug: string
  name: string
  description?: string
}

export interface UpdateProjectDto {
  name?: string
  description?: string
  status?: 'active' | 'inactive'
}

export interface CreateSchemaDto {
  name: string
  display_name: string
  definition: Record<string, unknown>
}

export interface UpdateSchemaDto {
  display_name?: string
  definition?: Record<string, unknown>
}
