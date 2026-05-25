import apiClient from './api'

export interface SpuCreateParams {
  category_id: number
  brand: string
  name: string
  model: string
  pet_type?: string
  description?: string
  ingredients?: string[]
  nutrition?: Record<string, any>
  pros?: string[]
  cons?: string[]
  extra_attrs?: Record<string, any>
  currency?: string
  image_urls?: string[]
  status?: string
}

export interface SpuUpdateParams {
  category_id?: number
  brand?: string
  name?: string
  model?: string
  pet_type?: string
  description?: string
  ingredients?: string[]
  nutrition?: Record<string, any>
  pros?: string[]
  cons?: string[]
  extra_attrs?: Record<string, any>
  currency?: string
  image_urls?: string[]
  status?: string
}

export interface SpuFilterParams {
  page?: number
  page_size?: number
  category_id?: number
  pet_type?: string
  brand?: string
  status?: string
  search?: string
}

export interface LinkListingParams {
  spu_id: number
}

export interface ImportParams {
  keyword: string
  max_results?: number
  platform?: string
}

export const spuApi = {
  list: (params?: SpuFilterParams) =>
    apiClient.get('/admin/goods/spus', { params }),
  get: (id: number) =>
    apiClient.get(`/admin/goods/spus/${id}`),
  create: (data: SpuCreateParams) =>
    apiClient.post('/admin/goods/spus', data),
  update: (id: number, data: SpuUpdateParams) =>
    apiClient.put(`/admin/goods/spus/${id}`, data),
  delete: (id: number) =>
    apiClient.delete(`/admin/goods/spus/${id}`),

  // Listings
  getListings: (spuId: number, params?: { match_status?: string }) =>
    apiClient.get(`/admin/goods/spus/${spuId}/listings`, { params }),
  linkListing: (listingId: number, data: LinkListingParams) =>
    apiClient.post(`/admin/goods/listings/${listingId}/link`, data),
  unlinkListing: (listingId: number) =>
    apiClient.post(`/admin/goods/listings/${listingId}/unlink`),

  // Import
  importListings: (data: ImportParams) =>
    apiClient.post('/admin/goods/listings/import', data),
  importListingsForSpu: (spuId: number, data: ImportParams) =>
    apiClient.post(`/admin/goods/spus/${spuId}/import-listings`, data),
  getJob: (jobId: string) =>
    apiClient.get(`/admin/goods/jobs/${jobId}`),

  // Matching Queue
  getMatchingQueue: (params?: { tier?: string; page?: number; page_size?: number }) =>
    apiClient.get('/admin/goods/matching-queue', { params }),
  confirmCandidates: (listingIds: number[]) =>
    apiClient.post('/admin/goods/matching-queue/confirm', { listing_ids: listingIds }),
  rejectCandidates: (listingIds: number[]) =>
    apiClient.post('/admin/goods/matching-queue/reject', { listing_ids: listingIds }),

  // AI Extraction
  parseIngredients: (imageBase64: string) =>
    apiClient.post('/admin/goods/spus/parse-ingredients', { image_base64: imageBase64 }),
  parseNutrition: (imageBase64?: string, text?: string) =>
    apiClient.post('/admin/goods/spus/parse-nutrition', { image_base64: imageBase64, text }),
  generateProsCons: (ingredients: string[], nutrition: Record<string, any>) =>
    apiClient.post('/admin/goods/spus/generate-pros-cons', { ingredients, nutrition }),
}
