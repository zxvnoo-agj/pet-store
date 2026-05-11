import { create } from 'zustand'

interface CompareState {
  compareList: number[]
  addToCompare: (productId: number) => void
  removeFromCompare: (productId: number) => void
  clearCompare: () => void
  isInCompare: (productId: number) => boolean
}

export const useCompareStore = create<CompareState>((set, get) => ({
  compareList: [],
  addToCompare: (productId) => {
    const { compareList } = get()
    if (compareList.length >= 4) {
      return
    }
    if (!compareList.includes(productId)) {
      set({ compareList: [...compareList, productId] })
    }
  },
  removeFromCompare: (productId) => {
    set({ compareList: get().compareList.filter((id) => id !== productId) })
  },
  clearCompare: () => set({ compareList: [] }),
  isInCompare: (productId) => get().compareList.includes(productId),
}))
