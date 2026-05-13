import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/v1'

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
