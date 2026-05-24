import { create } from 'zustand'

interface AuthState {
  token: string | null
  user: {
    id: number
    nickname: string
    avatar_url: string
  } | null
  isLoggedIn: boolean
  hasAddedPet: boolean
  setToken: (token: string | null) => void
  setUser: (user: AuthState['user']) => void
  setHasAddedPet: (val: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoggedIn: false,
  hasAddedPet: false,
  setToken: (token) => set({ token, isLoggedIn: !!token }),
  setUser: (user) => set({ user }),
  setHasAddedPet: (val) => set({ hasAddedPet: val }),
  logout: () => set({ token: null, user: null, isLoggedIn: false, hasAddedPet: false }),
}))
