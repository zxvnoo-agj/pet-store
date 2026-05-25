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
  reject: (id: number) => apiClient.post(`/admin/reviews/${id}/reject`),
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
  triggerXHS: (id: number) => apiClient.post(`/admin/collect/products/${id}/xhs-collect`),
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

export interface SeedProductParams {
  category_id: number
  product_name: string
  pdd_url: string
  pet_type: 'cat' | 'dog'
}
