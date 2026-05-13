import { create } from 'zustand'

interface AuthState {
  token: string | null
  user: { id: number; nickname: string; is_admin: boolean } | null
  isLoggedIn: boolean
  setToken: (token: string) => void
  setUser: (user: any) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('admin_token'),
  user: null,
  isLoggedIn: !!localStorage.getItem('admin_token'),
  setToken: (token) => {
    localStorage.setItem('admin_token', token)
    set({ token, isLoggedIn: true })
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem('admin_token')
    set({ token: null, user: null, isLoggedIn: false })
  },
}))
