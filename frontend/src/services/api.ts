import axios from 'axios'
import type { 
  ApiResponse, 
  User, 
  Project, 
  ResourceSchema, 
  LinkRule,
  LoginDto, 
  RegisterDto,
  CreateProjectDto,
  UpdateProjectDto,
  CreateSchemaDto,
  UpdateSchemaDto
} from '@/types'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && !('code' in response.data)) {
      response.data = {
        code: 0,
        message: response.data.message || 'success',
        data: response.data.data || response.data,
      }
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    if (error.response?.status === 403) {
      alert('您没有权限执行此操作')
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (data: LoginDto) => api.post<ApiResponse<{ access_token: string; user: User }>>('/auth/login', data),
  register: (data: RegisterDto) => api.post<ApiResponse<{ access_token: string; user: User }>>('/auth/register', data),
}

export const projectApi = {
  getAll: () => api.get<ApiResponse<Project[]>>('/_system/projects'),
  getById: (id: string) => api.get<ApiResponse<Project>>(`/_system/projects/${id}`),
  getBySlug: (slug: string) => api.get<ApiResponse<Project>>(`/_system/projects/slug/${slug}`),
  create: (data: CreateProjectDto) => api.post<ApiResponse<Project>>('/_system/projects', data),
  update: (id: string, data: UpdateProjectDto) => api.put<ApiResponse<Project>>(`/_system/projects/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/_system/projects/${id}`),
}

export const userApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) => 
    api.get<ApiResponse<{ items: User[]; total: number }>>('/_system/users', { params }),
  getById: (id: string) => api.get<ApiResponse<User>>(`/_system/users/${id}`),
  create: (data: Partial<User> & { password: string }) => api.post<ApiResponse<User>>('/_system/users', data),
  update: (id: string, data: Partial<User> & { password?: string }) => api.put<ApiResponse<User>>(`/_system/users/${id}`, data),
  updateStatus: (id: string, status: 'active' | 'inactive') => 
    api.put<ApiResponse<User>>(`/_system/users/${id}/status`, { status }),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/_system/users/${id}`),
  batchDelete: (ids: string[]) => api.delete<ApiResponse<{ affected: number }>>('/_system/users/batch', { data: { ids } }),
}

export const schemaApi = {
  getAll: (projectSlug: string) => api.get<ApiResponse<ResourceSchema[]>>(`/_system/schemas/${projectSlug}`),
  getById: (projectSlug: string, id: string) => api.get<ApiResponse<ResourceSchema>>(`/_system/schemas/${projectSlug}/${id}`),
  create: (projectSlug: string, data: CreateSchemaDto) => api.post<ApiResponse<ResourceSchema>>(`/_system/schemas/${projectSlug}`, data),
  update: (projectSlug: string, id: string, data: UpdateSchemaDto) => api.put<ApiResponse<ResourceSchema>>(`/_system/schemas/${projectSlug}/${id}`, data),
  delete: (projectSlug: string, id: string) => api.delete<ApiResponse<null>>(`/_system/schemas/${projectSlug}/${id}`),
}

export const linkApi = {
  getAll: () => api.get<ApiResponse<LinkRule[]>>('/_system/links'),
  getById: (id: string) => api.get<ApiResponse<LinkRule>>(`/_system/links/${id}`),
  create: (data: { sourceProjectId: string; targetProjectId: string; sourceResource: string; targetResource: string; mapping: Record<string, string> }) => 
    api.post<ApiResponse<LinkRule>>('/_system/links', data),
  update: (id: string, data: Partial<LinkRule>) => api.put<ApiResponse<LinkRule>>(`/_system/links/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/_system/links/${id}`),
}

export const crudApi = {
  list: (projectSlug: string, resourceName: string, params?: Record<string, unknown>) => 
    api.get<ApiResponse<{ items: unknown[]; total: number }>>(`/${projectSlug}/api/${resourceName}`, { params }),
  get: (projectSlug: string, resourceName: string, id: string) => 
    api.get<ApiResponse<unknown>>(`/${projectSlug}/api/${resourceName}/${id}`),
  create: (projectSlug: string, resourceName: string, data: Record<string, unknown>) => 
    api.post<ApiResponse<unknown>>(`/${projectSlug}/api/${resourceName}`, data),
  update: (projectSlug: string, resourceName: string, id: string, data: Record<string, unknown>) => 
    api.put<ApiResponse<unknown>>(`/${projectSlug}/api/${resourceName}/${id}`, data),
  delete: (projectSlug: string, resourceName: string, id: string) => 
    api.delete<ApiResponse<null>>(`/${projectSlug}/api/${resourceName}/${id}`),
}

export const docApi = {
  getOpenApiJson: (projectSlug: string) => api.get<Record<string, unknown>>(`/${projectSlug}/docs/openapi.json`),
  getOpenApiYaml: (projectSlug: string) => api.get<string>(`/${projectSlug}/docs/openapi.yaml`),
}

export const dashboardApi = {
  getActivities: (limit?: number) => api.get<ApiResponse<{ id: string; type: 'create' | 'update' | 'delete' | 'custom'; resource: string; project: string; user: string; timestamp: string; description: string }[]>>('dashboard/activities', { params: { limit } }),
  getStats: () => api.get<ApiResponse<{ 
    project_count: number; 
    user_count: number; 
    schema_count: number;
    today_views: number;
    total_records: number;
    api_calls: number;
    project_change: number;
    user_change: number;
    schema_change: number;
    views_change: number;
    records_change: number;
    api_change: number;
  }>>('dashboard/stats'),
  getSystemStatus: () => api.get<ApiResponse<{
    server: { status: string; response_time: number; uptime: number };
    disk: { usage_percent: number; total_gb: number; used_gb: number; free_gb: number };
    memory: { usage_percent: number; total_mb: number; used_mb: number; free_mb: number };
    connections: { active: number; peak: number };
    database: { status: string; size_mb: number; tables_count: number };
  }>>('dashboard/system-status'),
  getNotifications: () => api.get<ApiResponse<any[]>>('dashboard/notifications'),
  markNotificationAsRead: (id: string) => api.put<ApiResponse<{ success: boolean }>>(`dashboard/notifications/${id}/read`),
  markAllNotificationsAsRead: () => api.put<ApiResponse<{ success: boolean }>>('dashboard/notifications/read-all'),
  deleteNotification: (id: string) => api.delete<ApiResponse<{ success: boolean }>>(`dashboard/notifications/${id}`),
}

export const projectMemberApi = {
  getProjectMembers: (projectId: string) => api.get<ApiResponse<any[]>>(`/_system/project-members/project/${projectId}`),
  getUserMemberships: (userId: string) => api.get<ApiResponse<any[]>>(`/_system/project-members/user/${userId}`),
  addMember: (data: { project_id: string; user_id: string; role?: string }) => api.post<ApiResponse<any>>('/_system/project-members', data),
  updateRole: (projectId: string, userId: string, role: string) => api.put<ApiResponse<any>>(`/_system/project-members/${projectId}/${userId}`, { role }),
  removeMember: (projectId: string, userId: string) => api.delete<ApiResponse<null>>(`/_system/project-members/${projectId}/${userId}`),
  batchAdd: (data: { project_id: string; members: { user_id: string; role: string }[] }) => api.post<ApiResponse<any>>('/_system/project-members/batch', data),
}

export const settingsApi = {
  getAll: () => api.get<ApiResponse<any[]>>('settings'),
  getByKey: (key: string) => api.get<ApiResponse<any>>(`settings/${key}`),
  getByKeys: (keys: string[]) => api.post<ApiResponse<Record<string, string>>>('settings/keys', { keys }),
  upsert: (key: string, value: string, description?: string) => api.post<ApiResponse<any>>('settings', { key, value, description }),
  batchUpsert: (settings: { key: string; value: string; description?: string }[]) => api.post<ApiResponse<any[]>>('settings/batch', { settings }),
  delete: (key: string) => api.delete<ApiResponse<null>>(`settings/${key}`),
}

export const uploadApi = {
  upload: (file: File, category?: 'images' | 'documents') => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<ApiResponse<{
      id: string;
      originalName: string;
      storedName: string;
      mimeType: string;
      size: number;
      path: string;
      url: string;
      uploadedAt: string;
    }>>('uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { category },
    })
  },
  uploadMultiple: (files: File[], category?: 'images' | 'documents') => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    return api.post<ApiResponse<{
      uploaded: any[];
      errors: string[];
    }>>('uploads/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { category },
    })
  },
  delete: (path: string) => api.delete<ApiResponse<{ success: boolean }>>('uploads', { data: { path } }),
  getConfig: () => api.get<ApiResponse<{ maxFileSize: number; allowedExtensions: string[] }>>('uploads/config'),
}

export const exportApi = {
  exportData: (projectSlug: string, resourceName: string, format: 'json' | 'csv' = 'json', fields?: string) => {
    return api.get(`export/data`, {
      params: { project: projectSlug, resource: resourceName, format, fields },
      responseType: 'blob',
    })
  },
  exportCustom: (data: any, format: 'json' | 'csv' = 'json', fields?: string[], filename?: string) => {
    return api.post('export/custom', { data, format, fields, filename }, {
      responseType: 'blob',
    })
  },
  getFormats: () => api.get<ApiResponse<{ formats: { value: string; label: string; description: string }[] }>>('export/formats'),
}

export const healthApi = {
  check: () => api.get<ApiResponse<any>>('health'),
  ready: () => api.get<ApiResponse<{ status: string }>>('health/ready'),
  live: () => api.get<ApiResponse<{ status: string }>>('health/live'),
}

export default api
