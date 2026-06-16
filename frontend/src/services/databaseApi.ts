import api from './api';

export interface DatabaseConnection {
  id: string;
  project_id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  status: 'connected' | 'disconnected' | 'error';
  last_error: string | null;
  last_checked_at: Date | null;
  enabled: boolean;
  options: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDatabaseConnectionDto {
  name: string;
  type: string;
  host: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  options?: Record<string, any>;
}

export interface UpdateDatabaseConnectionDto {
  name?: string;
  type?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  enabled?: boolean;
  options?: Record<string, any>;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}

export const databaseApi = {
  list: async (projectSlug: string): Promise<{ data: DatabaseConnection[] }> => {
    const response = await api.get(`/${projectSlug}/databases`);
    return response.data;
  },

  get: async (projectSlug: string, id: string): Promise<{ data: DatabaseConnection }> => {
    const response = await api.get(`/${projectSlug}/databases/${id}`);
    return response.data;
  },

  create: async (projectSlug: string, data: CreateDatabaseConnectionDto): Promise<{ data: DatabaseConnection }> => {
    const response = await api.post(`/${projectSlug}/databases`, data);
    return response.data;
  },

  update: async (projectSlug: string, id: string, data: UpdateDatabaseConnectionDto): Promise<{ data: DatabaseConnection }> => {
    const response = await api.put(`/${projectSlug}/databases/${id}`, data);
    return response.data;
  },

  delete: async (projectSlug: string, id: string): Promise<{ data: { message: string } }> => {
    const response = await api.delete(`/${projectSlug}/databases/${id}`);
    return response.data;
  },

  test: async (projectSlug: string, id: string): Promise<{ data: TestConnectionResult }> => {
    const response = await api.post(`/${projectSlug}/databases/${id}/test`);
    return response.data;
  },

  testNew: async (data: CreateDatabaseConnectionDto): Promise<{ data: TestConnectionResult }> => {
    const response = await api.post('/test/databases/test', data);
    return response.data;
  },

  refresh: async (projectSlug: string): Promise<{ data: DatabaseConnection[] }> => {
    const response = await api.post(`/${projectSlug}/databases/refresh`);
    return response.data;
  },
};