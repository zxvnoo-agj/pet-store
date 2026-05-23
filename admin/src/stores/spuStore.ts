import { create } from 'zustand'
import { spuApi, SpuFilterParams } from '../services/spuApi'

export interface Spu {
  id: number
  category_id: number
  brand: string
  name: string
  model: string
  pet_type: string
  description?: string
  ingredients?: string[]
  nutrition?: Record<string, any>
  pros?: string[]
  cons?: string[]
  extra_attrs?: Record<string, any>
  price_min?: number
  price_max?: number
  currency: string
  image_urls?: string[]
  status: string
  listing_count?: number
  category?: {
    id: number
    name: string
    pet_type: string
  }
  created_at?: string
  updated_at?: string
}

export interface SpuListing {
  id: number
  spu_id: number
  platform: string
  shop_name: string
  goods_id?: string
  title: string
  price: number
  original_price?: number
  url: string
  image_url?: string
  sales_count?: number
  match_confidence?: number
  match_status: string
  last_synced_at?: string
  created_at?: string
  updated_at?: string
}

interface SpuState {
  // List state
  spus: Spu[]
  total: number
  loading: boolean
  error: string | null
  filters: SpuFilterParams

  // Detail state
  currentSpu: Spu | null
  currentListings: SpuListing[]
  detailLoading: boolean

  // Matching queue state
  queueListings: SpuListing[]
  queueTotal: number
  queueLoading: boolean
  queueFilters: {
    match_status?: string
    page?: number
    page_size?: number
  }

  // Import state
  importJobId: string | null
  importStatus: string | null

  // Actions
  fetchSpus: (filters?: SpuFilterParams) => Promise<void>
  fetchSpu: (id: number) => Promise<void>
  createSpu: (data: any) => Promise<Spu>
  updateSpu: (id: number, data: any) => Promise<Spu>
  deleteSpu: (id: number) => Promise<void>
  fetchListings: (spuId: number, matchStatus?: string) => Promise<void>
  fetchMatchingQueue: (filters?: { match_status?: string; page?: number; page_size?: number }) => Promise<void>
  confirmCandidates: (listingIds: number[]) => Promise<void>
  rejectCandidates: (listingIds: number[]) => Promise<void>
  pollImportStatus: () => Promise<any>
  setFilters: (filters: SpuFilterParams) => void
  setQueueFilters: (filters: { match_status?: string; page?: number; page_size?: number }) => void
  setImportJob: (jobId: string | null) => void
  setImportStatus: (status: string | null) => void
}

export const useSpuStore = create<SpuState>((set, get) => ({
  spus: [],
  total: 0,
  loading: false,
  error: null,
  filters: { page: 1, page_size: 20 },

  currentSpu: null,
  currentListings: [],
  detailLoading: false,

  queueListings: [],
  queueTotal: 0,
  queueLoading: false,
  queueFilters: { match_status: 'candidate', page: 1, page_size: 50 },

  importJobId: null,
  importStatus: null,

  fetchSpus: async (filters) => {
    set({ loading: true, error: null })
    try {
      const params = { ...get().filters, ...filters }
      const res = await spuApi.list(params)
      set({
        spus: res.data.data?.products || res.data.data?.items || [],
        total: res.data.pagination?.total || 0,
        loading: false,
      })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch SPUs', loading: false })
    }
  },

  fetchSpu: async (id) => {
    set({ detailLoading: true })
    try {
      const res = await spuApi.get(id)
      set({ currentSpu: res.data.data?.spu, detailLoading: false })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch SPU', detailLoading: false })
    }
  },

  createSpu: async (data) => {
    const res = await spuApi.create(data)
    const spu = res.data.data?.spu || res.data.data
    set((state) => ({ spus: [spu, ...state.spus], total: state.total + 1 }))
    return spu
  },

  updateSpu: async (id, data) => {
    const res = await spuApi.update(id, data)
    const spu = res.data.data?.spu || res.data.data
    set((state) => ({
      spus: state.spus.map((s) => (s.id === id ? spu : s)),
      currentSpu: state.currentSpu?.id === id ? spu : state.currentSpu,
    }))
    return spu
  },

  deleteSpu: async (id) => {
    await spuApi.delete(id)
    set((state) => ({
      spus: state.spus.filter((s) => s.id !== id),
      total: state.total - 1,
    }))
  },

  fetchListings: async (spuId, matchStatus) => {
    try {
      const res = await spuApi.getListings(spuId, matchStatus ? { match_status: matchStatus } : undefined)
      set({ currentListings: res.data.data?.items || [] })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch listings' })
    }
  },

  fetchMatchingQueue: async (filters) => {
    set({ queueLoading: true })
    try {
      const params = { ...get().queueFilters, ...filters }
      const res = await spuApi.getMatchingQueue(params)
      set({
        queueListings: res.data.data?.items || [],
        queueTotal: res.data.pagination?.total || 0,
        queueLoading: false,
      })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch matching queue', queueLoading: false })
    }
  },

  confirmCandidates: async (listingIds) => {
    await spuApi.confirmCandidates(listingIds)
    set((state) => ({
      queueListings: state.queueListings.filter((l) => !listingIds.includes(l.id)),
      queueTotal: state.queueTotal - listingIds.length,
    }))
  },

  rejectCandidates: async (listingIds) => {
    await spuApi.rejectCandidates(listingIds)
    set((state) => ({
      queueListings: state.queueListings.filter((l) => !listingIds.includes(l.id)),
      queueTotal: state.queueTotal - listingIds.length,
    }))
  },

  pollImportStatus: async () => {
    const jobId = get().importJobId
    if (!jobId) return

    try {
      const res = await spuApi.getJob(jobId)
      const job = res.data.data
      set({ importStatus: job.status })

      if (job.status === 'completed' || job.status === 'failed') {
        set({ importJobId: null })
      }

      return job
    } catch (err: any) {
      set({ error: err.message || 'Failed to poll job status' })
    }
  },

  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setQueueFilters: (filters) => set((state) => ({ queueFilters: { ...state.queueFilters, ...filters } })),
  setImportJob: (jobId) => set({ importJobId: jobId }),
  setImportStatus: (status) => set({ importStatus: status }),
}))
