import { create } from 'zustand'
import { apiClient } from '../services/api'
import type { Spu } from '../types'

interface SpuState {
  spus: Spu[]
  selectedCategory: number | null
  filters: {
    pet_type?: string
    category_id?: number
    brand?: string
    min_price?: number
    max_price?: number
    sort?: string
    search?: string
  }
  loading: boolean
  error: string | null
  setSpus: (spus: Spu[]) => void
  setSelectedCategory: (id: number | null) => void
  setFilters: (filters: Partial<SpuState['filters']>) => void
  fetchSpus: (overrideFilters?: Partial<SpuState['filters']>) => Promise<void>
  searchSpus: (query: string, petType?: string) => Promise<Spu[]>
}

export const useSpuStore = create<SpuState>((set, get) => ({
  spus: [],
  selectedCategory: null,
  filters: {},
  loading: false,
  error: null,
  setSpus: (spus) => set({ spus }),
  setSelectedCategory: (id) => set({ selectedCategory: id }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  fetchSpus: async (overrideFilters) => {
    set({ loading: true, error: null })
    try {
      const currentFilters = get().filters
      const filters = { ...currentFilters, ...overrideFilters }
      const query: any = { page: 1, page_size: 20 }
      if (filters.pet_type) query.pet_type = filters.pet_type
      if (filters.category_id) query.category_id = filters.category_id
      if (filters.brand) query.brand = filters.brand
      if (filters.min_price) query.min_price = filters.min_price
      if (filters.max_price) query.max_price = filters.max_price
      if (filters.sort) query.sort = filters.sort
      if (filters.search) query.search = filters.search

      const res = await apiClient.get('/spus', query)
      set({ spus: res.items || [], loading: false })
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch SPUs', loading: false })
    }
  },
  searchSpus: async (query, petType) => {
    const params: any = { q: query, page: 1, page_size: 20 }
    if (petType) params.pet_type = petType
    const res = await apiClient.get('/search', params)
    return res.spus || []
  },
}))

// Backward-compatible export
export const useProductStore = useSpuStore
