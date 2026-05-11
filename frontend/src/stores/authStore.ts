import { create } from 'zustand'

interface AuthState {
  token: string | null
  user: {
    id: number
    nickname: string
    avatar_url: string
  } | null
  isLoggedIn: boolean
  setToken: (token: string | null) => void
  setUser: (user: AuthState['user']) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoggedIn: false,
  setToken: (token) => set({ token, isLoggedIn: !!token }),
  setUser: (user) => set({ user }),
  logout: () => set({ token: null, user: null, isLoggedIn: false }),
}))
