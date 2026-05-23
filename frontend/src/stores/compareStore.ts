import { create } from 'zustand'
import Taro from '@tarojs/taro'
import { apiClient } from '../services/api'

interface CompareProduct {
  id: number
  name: string
  brand: string
  pet_type: string
  description: string | null
  ingredients: string[]
  nutrition: Record<string, any>
  price_range: { min: number; max: number }
  image_urls: string[]
  rating: number
  pros: string[]
  cons: string[]
  review_count: number
}

interface CompareState {
  compareList: number[]
  products: CompareProduct[]
  loading: boolean
  dimensions: string[]
  addToCompare: (spuId: number) => Promise<void>
  removeFromCompare: (spuId: number) => void
  clearCompare: () => void
  isInCompare: (spuId: number) => boolean
  fetchCompareData: () => Promise<void>
}

export const useCompareStore = create<CompareState>((set, get) => ({
  compareList: [],
  products: [],
  loading: false,
  dimensions: [],

  addToCompare: async (spuId) => {
    const { compareList } = get()
    if (compareList.length >= 4) {
      Taro.showToast({ title: '最多对比4个商品', icon: 'none' })
      return
    }
    if (compareList.includes(spuId)) {
      Taro.showToast({ title: '该商品已在对比栏', icon: 'none' })
      return
    }
    const newList = [...compareList, spuId]
    set({ compareList: newList })
    Taro.showToast({ title: '已加入对比', icon: 'success' })
    await get().fetchCompareData()
  },

  removeFromCompare: (spuId) => {
    const newList = get().compareList.filter((id) => id !== spuId)
    set({
      compareList: newList,
      products: get().products.filter((p) => p.id !== spuId),
    })
  },

  clearCompare: () => set({ compareList: [], products: [], dimensions: [] }),

  isInCompare: (spuId) => get().compareList.includes(spuId),

  fetchCompareData: async () => {
    const { compareList } = get()
    if (compareList.length < 2) {
      set({ products: [], dimensions: [] })
      return
    }
    set({ loading: true })
    try {
      const ids = compareList.join(',')
      const res = await apiClient.get('/spus/compare', { ids })
      set({
        products: res.products || [],
        dimensions: res.comparison?.dimensions || [],
        loading: false,
      })
    } catch (error) {
      console.error('Failed to fetch compare data:', error)
      Taro.showToast({ title: '获取对比数据失败', icon: 'none' })
      set({ loading: false })
    }
  },
}))
