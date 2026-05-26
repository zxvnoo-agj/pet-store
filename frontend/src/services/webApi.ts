const API_BASE_URL = process.env.TARO_ENV === 'h5' && process.env.NODE_ENV === 'production'
  ? 'https://api.your-domain.com/v1'
  : 'http://127.0.0.1:8001/v1'

interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

class WebApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private getToken(): string | null {
    try {
      const raw = localStorage.getItem('auth-storage')
      if (raw) {
        const parsed = JSON.parse(raw)
        return parsed?.state?.token || null
      }
    } catch {}
    return null
  }

  async request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${this.baseURL}${url}`, {
      ...options,
      headers,
    })

    if (res.headers.get('content-type')?.includes('text/event-stream')) {
      return res as any
    }

    const body: ApiResponse<T> = await res.json()

    if (body.code !== 0) {
      throw new Error(body.message || 'Request failed')
    }

    return body.data as T
  }

  get<T = any>(url: string): Promise<T> {
    return this.request<T>(url)
  }

  post<T = any>(url: string, data?: any): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    })
  }
}

export const webApi = new WebApiClient(API_BASE_URL)
