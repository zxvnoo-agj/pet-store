import Taro from '@tarojs/taro'
import { useAuthStore } from '../stores/authStore'

const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8001/v1'
  : 'https://api.your-domain.com/v1'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: any
  headers?: Record<string, string>
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  setToken(token: string | null) {
    // 保持兼容，实际每次请求都从 store 读取
    if (token) {
      useAuthStore.getState().setToken(token)
    }
  }

  private getToken(): string | null {
    return useAuthStore.getState().token
  }

  async request<T = any>(options: RequestOptions): Promise<T> {
    const { url, method = 'GET', data, headers = {} } = options

    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const res = await Taro.request({
        url: `${this.baseURL}${url}`,
        method,
        data,
        header: {
          'Content-Type': 'application/json',
          ...headers,
        },
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const result = res.data as any
        if (result.code !== 0) {
          throw new Error(result.message || 'Request failed')
        }
        return result.data as T
      }

      throw new Error(`HTTP ${res.statusCode}`)
    } catch (error: any) {
      console.error('API Error:', error)
      throw error
    }
  }

  get<T = any>(url: string, params?: any): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : ''
    return this.request<T>({ url: url + queryString, method: 'GET' })
  }

  post<T = any>(url: string, data?: any): Promise<T> {
    return this.request<T>({ url, method: 'POST', data })
  }

  put<T = any>(url: string, data?: any): Promise<T> {
    return this.request<T>({ url, method: 'PUT', data })
  }

  delete<T = any>(url: string): Promise<T> {
    return this.request<T>({ url, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient
