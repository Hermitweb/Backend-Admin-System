import api from './api';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, any>;
}

export const notificationApi = {
  getAll: async (): Promise<{ data: Notification[] }> => {
    try {
      const response = await api.get('/dashboard/notifications');
      return response.data;
    } catch {
      return { data: [] };
    }
  },

  getUnreadCount: async (): Promise<{ data: number }> => {
    try {
      const response = await api.get('/dashboard/notifications/unread');
      return response.data;
    } catch {
      return { data: 0 };
    }
  },

  markAsRead: async (id: string): Promise<{ data: { success: boolean } }> => {
    const response = await api.put(`/dashboard/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ data: { success: boolean } }> => {
    const response = await api.put('/dashboard/notifications/read-all');
    return response.data;
  },

  delete: async (id: string): Promise<{ data: { success: boolean } }> => {
    const response = await api.delete(`/dashboard/notifications/${id}`);
    return response.data;
  },
};
