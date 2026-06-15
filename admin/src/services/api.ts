import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export default apiClient

export const adminAuthApi = {
  login: (username: string, password: string) =>
    apiClient.post('/admin/auth/login', { username, password }),
  me: () => apiClient.get('/admin/auth/me'),
}

export const adminProductApi = {
  list: (params?: any) => apiClient.get('/admin/products', { params }),
  get: (id: number) => apiClient.get(`/admin/products/${id}`),
  create: (data: any) => apiClient.post('/admin/products', data),
  update: (id: number, data: any) => apiClient.put(`/admin/products/${id}`, data),
  delete: (id: number) => apiClient.delete(`/admin/products/${id}`),
  batchDelete: (ids: number[]) => apiClient.post('/admin/products/batch-delete', ids),
  refreshDdk: (id: number) => apiClient.post(`/admin/products/${id}/refresh-ddk`),
}

export const adminCategoryApi = {
  list: (params?: any) => apiClient.get('/admin/categories', { params }),
  get: (id: number) => apiClient.get(`/admin/categories/${id}`),
  create: (data: any) => apiClient.post('/admin/categories', data),
  update: (id: number, data: any) => apiClient.put(`/admin/categories/${id}`, data),
  delete: (id: number) => apiClient.delete(`/admin/categories/${id}`),
}

export const adminReviewApi = {
  list: (params?: any) => apiClient.get('/admin/reviews', { params }),
  approve: (id: number) => apiClient.post(`/admin/reviews/${id}/approve`),
  reject: (id: number, reason: string) => apiClient.post(`/admin/reviews/${id}/reject`, { reason }),
  create: (data: AdminReviewCreateRequest) => apiClient.post('/admin/reviews', data),
  delete: (id: number) => apiClient.delete(`/admin/reviews/${id}`),
}

export const adminCollectApi = {
  listStrategies: (params?: any) => apiClient.get('/admin/collect/strategies', { params }),
  createStrategy: (data: any) => apiClient.post('/admin/collect/strategies', data),
  executeStrategy: (id: number) => apiClient.post(`/admin/collect/strategies/${id}/execute`),
  deleteStrategy: (id: number) => apiClient.delete(`/admin/collect/strategies/${id}`),
  listProducts: (params?: any) => apiClient.get('/admin/collect/products', { params }),
  seedProduct: (data: any) => apiClient.post('/admin/collect/products/seed', data),
  retryProduct: (id: number) => apiClient.post(`/admin/collect/products/${id}/retry`),
  listJobs: (params?: any) => apiClient.get('/admin/collect/jobs', { params }),
  getJob: (id: number) => apiClient.get(`/admin/collect/jobs/${id}`),
  retryJob: (id: number) => apiClient.post(`/admin/collect/jobs/${id}/retry`),
  triggerXHSForSpu: (spuId: number) => apiClient.post(`/admin/spus/${spuId}/xhs-collect`),
  regenerateReviewSummary: (spuId: number) =>
    apiClient.post(`/admin/spus/${spuId}/reviews/summary/regenerate`),
  listSources: () => apiClient.get('/admin/collect/sources'),
  updateSource: (id: number, data: any) => apiClient.patch(`/admin/collect/sources/${id}`, data),
  schedulerStatus: () => apiClient.get('/admin/collect/scheduler/status'),
  triggerSchedulerJob: (jobId: string) => apiClient.post(`/admin/collect/scheduler/trigger/${jobId}`),
  aggregateTags: (id: number) => apiClient.post(`/admin/collect/products/${id}/aggregate-tags`),
}


export const promotionUrlApi = {
  get: (productId: number) => apiClient.get(`/products/${productId}/promotion-url`),
}

export interface PromotionUrlResponse {
  short_url: string
  mobile_url: string | null
  we_app_url: string | null
  cached: boolean
}

export const adminImportApi = {
  importForSpu: (spuId: number, data: { keyword?: string; max_results?: number; source?: string }) =>
    apiClient.post(`/admin/goods/spus/${spuId}/import-listings`, data),
}

export interface SeedProductParams {
  category_id: number
  product_name: string
  pdd_url: string
  pet_type: 'cat' | 'dog'
}

export type ReviewSource = 'user' | 'xhs_manual' | 'xhs_auto' | 'admin_seed'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface AdminReviewCreateRequest {
  spu_id: number
  rating: number
  content: string
  is_recommended?: boolean
  source: Extract<ReviewSource, 'admin_seed' | 'xhs_manual'>
  source_url?: string
  external_note_id?: string
  author?: string
}
