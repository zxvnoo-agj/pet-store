import Taro from '@tarojs/taro'

const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8000/v1'
  : 'https://api.your-domain.com/v1'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: any
  headers?: Record<string, string>
}

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  setToken(token: string | null) {
    this.token = token
  }

  async request<T = any>(options: RequestOptions): Promise<T> {
    const { url, method = 'GET', data, headers = {} } = options

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
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
