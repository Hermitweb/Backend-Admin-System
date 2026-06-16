import { create } from 'zustand'
import type { User } from '@/types'
import { authApi } from '@/services/api'

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoggedIn: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('access_token'),
  isLoggedIn: !!localStorage.getItem('access_token'),
  loading: false,

  login: async (email, password) => {
    set({ loading: true })
    try {
      const response = await authApi.login({ email, password })
      const { access_token, user } = response.data.data
      localStorage.setItem('access_token', access_token)
      set({ user, accessToken: access_token, isLoggedIn: true })
    } finally {
      set({ loading: false })
    }
  },

  register: async (email, password, name) => {
    set({ loading: true })
    try {
      const response = await authApi.register({ email, password, name })
      const { access_token, user } = response.data.data
      localStorage.setItem('access_token', access_token)
      set({ user, accessToken: access_token, isLoggedIn: true })
    } finally {
      set({ loading: false })
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    set({ user: null, accessToken: null, isLoggedIn: false })
  },

  initialize: () => {
    const token = localStorage.getItem('access_token')
    if (token) {
      set({ accessToken: token, isLoggedIn: true })
    }
  },
}))
