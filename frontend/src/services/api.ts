import Taro from '@tarojs/taro'
import { useAuthStore } from '../stores/authStore'
import { API_BASE_URL } from '../config/env'

const BASE_URL = API_BASE_URL

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

export const apiClient = new ApiClient(BASE_URL)

export interface Spu {
  id: number
  name: string
  brand: string
  category?: {
    id: number
    name: string
    pet_type: string
  }
  pet_type?: string
  price_min: number
  price_max: number
  image_urls: string[]
  rating: number
  review_count: number
  pros?: string[]
  cons?: string[]
}

export interface SearchSpusResponse {
  items: Spu[]
  total: number
}

export async function searchSpusByKeywords(
  keywords: string[],
  petType?: string
): Promise<SearchSpusResponse> {
  const params: Record<string, string> = {
    keywords: keywords.join(','),
  }
  if (petType) {
    params.pet_type = petType
  }
  return apiClient.get('/spus/search', params)
}

export type ReviewSource = 'user' | 'xhs_manual' | 'xhs_auto' | 'admin_seed'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface ReviewItem {
  id: number
  spu_id: number
  external_note_id?: string
  rating: number
  content: string
  author?: string
  note_likes?: number
  note_published_at?: string
  source_url?: string
  tags: string[]
  is_recommended?: boolean
  source: ReviewSource
  source_label: string
  status: ReviewStatus
  status_label: string
  reject_reason?: string
  created_at: string
  comments?: string[]
}

export type XHSNote = ReviewItem

export interface AiReviewSummary {
  overall_pros: string[]
  overall_cons: string[]
  recommendation: string
  recommend_rate: number
  summary: string
  generated_at?: string
  review_count: number
}

export interface SpuReviewsResponse {
  ai_summary: AiReviewSummary | null
  reviews: ReviewItem[]
  notes?: ReviewItem[]
  my_review?: ReviewItem | null
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

export async function getSpuReviews(spuId: number, page: number = 1): Promise<SpuReviewsResponse> {
  return apiClient.get(`/spus/${spuId}/reviews`, { page, page_size: 20 })
}

export interface SubmitReviewRequest {
  rating: number
  content: string
  is_recommended?: boolean
}

export interface SubmitReviewResponse {
  review: ReviewItem
  message: string
}

export async function submitReview(
  spuId: number,
  data: SubmitReviewRequest
): Promise<SubmitReviewResponse> {
  return apiClient.post(`/spus/${spuId}/reviews`, data)
}

export default apiClient
