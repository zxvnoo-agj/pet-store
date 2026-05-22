import { useState, useEffect, useRef } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import SpuCard from '../../components/SpuCard'
import { useCompareStore } from '../../stores/compareStore'
import { apiClient } from '../../services/api'

type SortType = 'default' | 'price_asc' | 'price_desc' | 'rating'

const PAGE_SIZE = 20

export default function ProductListPage() {
  const router = useRouter()
  const { params } = router
  const [sortBy, setSortBy] = useState<SortType>('default')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [spus, setSpus] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  
  // 使用 ref 追踪分页状态，避免闭包问题
  const pageRef = useRef(1)
  const loadingRef = useRef(false)
  const hasMoreRef = useRef(true)
  const loadedCountRef = useRef(0)

  const { compareList } = useCompareStore()

  const petType = params?.petType || ''
  const categoryId = params?.categoryId || ''
  const category = decodeURIComponent(params?.category || '')
  const searchQuery = decodeURIComponent(params?.search || '')

  // 当筛选条件变化时，重置并重新加载
  useEffect(() => {
    pageRef.current = 1
    loadingRef.current = false
    hasMoreRef.current = true
    loadedCountRef.current = 0
    setSpus([])
    setHasMore(true)
    setTotal(0)
    
    // 使用 setTimeout 确保状态重置后再加载
    setTimeout(() => {
      loadSpus(1, true)
    }, 0)
  }, [petType, categoryId, category, searchQuery, sortBy])

  const loadSpus = async (targetPage: number, isRefresh: boolean = false) => {
    // 使用 ref 检查状态，避免闭包问题
    if (loadingRef.current && !isRefresh) return
    if (!isRefresh && !hasMoreRef.current) return

    loadingRef.current = true
    setLoading(true)
    
    try {
      const query: any = { page: targetPage, page_size: PAGE_SIZE }
      if (petType) query.pet_type = petType
      if (categoryId) query.category_id = categoryId
      if (sortBy !== 'default') query.sort = sortBy

      const res = await apiClient.get('/spus', query)
      const newItems = res.items || []
      const pagination = res.pagination || {}

      const currentTotal = pagination.total || 0
      
      if (isRefresh) {
        setSpus(newItems)
      } else {
        setSpus(prev => {
          const updated = [...prev, ...newItems]
          return updated
        })
      }

      setTotal(currentTotal)
      
      // 使用 ref 追踪已加载数量，避免闭包问题
      if (isRefresh) {
        loadedCountRef.current = newItems.length
      } else {
        loadedCountRef.current += newItems.length
      }
      
      // 判断是否还有更多数据
      const hasMoreData = newItems.length > 0 && loadedCountRef.current < currentTotal
      
      hasMoreRef.current = hasMoreData
      setHasMore(hasMoreData)
      pageRef.current = targetPage
    } catch (error) {
      console.error('Failed to fetch SPUs:', error)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  const handleScroll = (e: any) => {
    const { scrollTop, scrollHeight, clientHeight } = e.detail
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150
    
    if (isNearBottom && !loadingRef.current && hasMoreRef.current) {
      const nextPage = pageRef.current + 1
      loadSpus(nextPage, false)
    }
  }

  const getPageTitle = () => {
    if (searchQuery) return `搜索: ${searchQuery}`
    if (petType && category) return `${petType === 'cat' ? '猫咪' : '狗狗'}${category}`
    if (petType) return petType === 'cat' ? '猫咪用品' : '狗狗用品'
    if (category) return category
    return '全部商品'
  }

  const sortOptions: { key: SortType; label: string }[] = [
    { key: 'default', label: '综合排序' },
    { key: 'rating', label: '评分最高' },
    { key: 'price_asc', label: '价格最低' },
    { key: 'price_desc', label: '价格最高' },
  ]

  const goBack = () => {
    Taro.navigateBack()
  }

  return (
    <View className="flex flex-col h-screen bg-gray-50">
      {/* 头部 */}
      <View className="shrink-0 bg-white px-4 py-2.5 flex items-center gap-3 border-b border-gray-100">
        <Text className="text-gray-600" onClick={goBack}>←</Text>
        <Text className="flex-1 text-sm font-bold text-gray-800 truncate">{getPageTitle()}</Text>
        <View
          className="flex items-center gap-1 text-xs text-gray-500"
          onClick={() => setShowSortMenu(!showSortMenu)}
        >
          <Text>筛选 ▼</Text>
        </View>
      </View>

      {/* 排序菜单 */}
      {showSortMenu && (
        <View className="shrink-0 bg-white border-b border-gray-100 px-4 py-2 flex gap-2">
          {sortOptions.map((opt) => (
            <View
              key={opt.key}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                sortBy === opt.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
              onClick={() => {
                setSortBy(opt.key)
                setShowSortMenu(false)
              }}
            >
              <Text>{opt.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 结果数 */}
      <View className="shrink-0 px-4 py-2 bg-gray-50">
        <Text className="text-xs text-gray-400">共 {total} 件商品</Text>
      </View>

      {/* 商品列表 - 支持滚动加载 */}
      <ScrollView
        className="flex-1"
        scrollY
        onScroll={handleScroll}
        style={{ height: '100%' }}
      >
        <View className="px-4 pb-4 space-y-3">
          {spus.map((spu: any) => (
            <SpuCard key={spu.id} spu={spu} />
          ))}

          {/* 加载状态 */}
          {loading && (
            <View className="flex items-center justify-center py-4">
              <Text className="text-xs text-gray-400">加载中...</Text>
            </View>
          )}

          {/* 没有更多 */}
          {!loading && !hasMore && spus.length > 0 && (
            <View className="flex items-center justify-center py-4">
              <Text className="text-xs text-gray-400">已经到底了</Text>
            </View>
          )}

          {/* 空状态 */}
          {spus.length === 0 && !loading && (
            <View className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Text className="text-sm mt-3">暂无相关商品</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 对比浮动栏 */}
      {compareList.length > 0 && (
        <View
          className="shrink-0 px-4 py-2.5 bg-white border-t border-gray-100 flex items-center gap-3 z-10"
        >
          <View className="flex items-center gap-2 flex-1">
            <View className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <Text className="text-sm">📊</Text>
            </View>
            <Text className="text-sm text-gray-700">
              已选 <Text className="text-orange-500 font-bold">{compareList.length}</Text> 个商品
            </Text>
          </View>
          <View
            className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-full"
            onClick={() => Taro.navigateTo({ url: '/pages/product/compare' })}
          >
            <Text>去对比</Text>
          </View>
        </View>
      )}
    </View>
  )
}
