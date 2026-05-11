import { create } from 'zustand'
import { apiClient } from '../services/api'

interface Product {
  id: number
  name: string
  brand: string
  price_range: { min: number; max: number }
  image_urls: string[]
  ratings: Record<string, number>
  pros: string[]
  cons: string[]
  review_count: number
}

interface ProductState {
  products: Product[]
  selectedCategory: number | null
  filters: {
    pet_type?: string
    brand?: string
    min_price?: number
    max_price?: number
    sort?: string
  }
  loading: boolean
  error: string | null
  setProducts: (products: Product[]) => void
  setSelectedCategory: (id: number | null) => void
  setFilters: (filters: Partial<ProductState['filters']>) => void
  fetchProducts: (overrideFilters?: Partial<ProductState['filters']>) => Promise<void>
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  selectedCategory: null,
  filters: {},
  loading: false,
  error: null,
  setProducts: (products) => set({ products }),
  setSelectedCategory: (id) => set({ selectedCategory: id }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  fetchProducts: async (overrideFilters) => {
    set({ loading: true, error: null })
    try {
      const currentFilters = get().filters
      const filters = { ...currentFilters, ...overrideFilters }
      const query: any = { page: 1, page_size: 20 }
      if (filters.pet_type) query.pet_type = filters.pet_type
      if (filters.brand) query.brand = filters.brand
      if (filters.min_price) query.min_price = filters.min_price
      if (filters.max_price) query.max_price = filters.max_price
      if (filters.sort) query.sort = filters.sort

      const res = await apiClient.get('/products', query)
      set({ products: res.products || [], loading: false })
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch products', loading: false })
    }
  },
}))
