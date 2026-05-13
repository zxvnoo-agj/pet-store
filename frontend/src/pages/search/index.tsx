import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { apiClient } from '../../services/api'
import ProductCard from '../../components/ProductCard'

const HOT_SEARCHES = ['猫粮', '狗粮', '猫砂', '牵引绳', '冻干', '罐头', '猫窝']
const SEARCH_HISTORY_KEY = 'search_history'

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const inputRef = useRef<any>(null)

  // 加载搜索历史
  useEffect(() => {
    try {
      const history = Taro.getStorageSync(SEARCH_HISTORY_KEY) || []
      setSearchHistory(history)
    } catch (e) {
      console.error('Failed to load search history:', e)
    }
  }, [])

  // 保存搜索历史
  const saveSearchHistory = useCallback((keyword: string) => {
    if (!keyword.trim()) return
    try {
      const history: string[] = Taro.getStorageSync(SEARCH_HISTORY_KEY) || []
      const newHistory = [keyword, ...history.filter(h => h !== keyword)].slice(0, 10)
      Taro.setStorageSync(SEARCH_HISTORY_KEY, newHistory)
      setSearchHistory(newHistory)
    } catch (e) {
      console.error('Failed to save search history:', e)
    }
  }, [])

  // 获取搜索建议
  const fetchSuggestions = useCallback(
    debounce(async (keyword: string) => {
      if (!keyword.trim()) {
        setSuggestions([])
        return
      }
      try {
        const res = await apiClient.get('/search/suggestions', { q: keyword, limit: 8 })
        setSuggestions(res || [])
        setShowSuggestions(true)
      } catch (error) {
        console.error('Failed to fetch suggestions:', error)
        setSuggestions([])
      }
    }, 300),
    []
  )

  // 执行搜索
  const performSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim()) return
    setLoading(true)
    setShowSuggestions(false)
    setQuery(keyword)
    saveSearchHistory(keyword)

    try {
      const res = await apiClient.get('/search', { q: keyword })
      // 转换数据格式以适配 ProductCard 组件
      const formattedResults = {
        ...res,
        products: (res.products || []).map((p: any) => ({
          ...p,
          price_min: p.price_range?.min ?? 0,
          price_max: p.price_range?.max ?? 0,
          ratings: p.ratings || { overall: 0 },
          reviewCount: p.review_count || 0,
          pros: p.pros || [],
          cons: p.cons || [],
        })),
      }
      setResults(formattedResults)
    } catch (error) {
      console.error('Search failed:', error)
      Taro.showToast({ title: '搜索失败', icon: 'none' })
      setResults({ products: [], categories: [], brands: [], suggestions: [] })
    } finally {
      setLoading(false)
    }
  }, [saveSearchHistory])

  // 处理输入变化
  const handleInputChange = (e: any) => {
    const value = e.detail.value
    setQuery(value)
    if (value.trim()) {
      fetchSuggestions(value)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
      setResults(null)
    }
  }

  // 清除搜索
  const clearSearch = () => {
    setQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    setResults(null)
  }

  // 清除历史记录
  const clearHistory = () => {
    try {
      Taro.removeStorageSync(SEARCH_HISTORY_KEY)
      setSearchHistory([])
    } catch (e) {
      console.error('Failed to clear history:', e)
    }
  }

  // 点击建议项
  const handleSuggestionClick = (suggestion: any) => {
    performSearch(suggestion.text)
  }

  // 导航到商品详情
  const navigateToProduct = (productId: number) => {
    Taro.navigateTo({ url: `/pages/product/detail?id=${productId}` })
  }

  // 导航到商品列表（按分类或品牌筛选）
  const navigateToList = (params: { category?: string; brand?: string; petType?: string }) => {
    const queryParts: string[] = []
    if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`)
    if (params.brand) queryParts.push(`brand=${encodeURIComponent(params.brand)}`)
    if (params.petType) queryParts.push(`petType=${params.petType}`)
    
    Taro.navigateTo({ url: `/pages/product/list?${queryParts.join('&')}` })
  }

  return (
    <View className="flex flex-col h-screen bg-gray-50">
      {/* 搜索栏 */}
      <View className="shrink-0 bg-white px-4 py-2.5 flex items-center gap-3 border-b border-gray-100">
        <View className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-3.5 py-2">
          <Text className="text-gray-400 text-sm">🔍</Text>
          <Input
            ref={inputRef}
            className="flex-1 text-sm text-gray-800"
            placeholder="搜索猫粮、狗粮、用品..."
            value={query}
            onInput={handleInputChange}
            confirmType="search"
            onConfirm={(e: any) => performSearch(e.detail.value)}
            focus
          />
          {query.length > 0 && (
            <Text className="text-gray-400 text-xs" onClick={clearSearch}>✕</Text>
          )}
        </View>
        <Text 
          className="text-sm text-gray-600 font-medium"
          onClick={() => Taro.navigateBack()}
        >
          取消
        </Text>
      </View>

      {/* 搜索建议下拉 */}
      {showSuggestions && suggestions.length > 0 && !results && (
        <View className="shrink-0 bg-white border-b border-gray-100">
          {suggestions.map((suggestion, index) => (
            <View
              key={`${suggestion.type}-${index}`}
              className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 active:bg-gray-50"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <Text className="text-sm text-gray-400">
                {suggestion.type === 'product' ? '📦' : suggestion.type === 'brand' ? '🏷️' : '📁'}
              </Text>
              <Text 
                className="flex-1 text-sm text-gray-800"
                dangerouslySetInnerHTML={{ __html: suggestion.highlight }}
              />
              <Text className="text-xs text-gray-400">
                {suggestion.type === 'product' ? '商品' : suggestion.type === 'brand' ? '品牌' : '分类'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 搜索结果 */}
      {results && (
        <ScrollView className="flex-1" scrollY>
          {/* 相关分类和品牌 */}
          {(results.categories?.length > 0 || results.brands?.length > 0) && (
            <View className="bg-white px-4 py-3 mb-2">
              {results.categories?.length > 0 && (
                <View className="mb-2">
                  <Text className="text-xs text-gray-500 mb-1.5">相关分类</Text>
                  <View className="flex flex-wrap gap-2">
                    {results.categories.map((cat: any) => (
                      <View
                        key={cat.id}
                        className="px-3 py-1 bg-orange-50 text-orange-600 text-xs rounded-full"
                        onClick={() => navigateToList({ category: cat.name, petType: cat.pet_type })}
                      >
                        <Text>{cat.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {results.brands?.length > 0 && (
                <View>
                  <Text className="text-xs text-gray-500 mb-1.5">相关品牌</Text>
                  <View className="flex flex-wrap gap-2">
                    {results.brands.map((brand: string) => (
                      <View
                        key={brand}
                        className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full"
                        onClick={() => navigateToList({ brand })}
                      >
                        <Text>{brand}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 商品列表 */}
          <View className="px-4 py-3">
            <View className="flex items-center justify-between mb-3">
              <Text className="text-sm font-medium text-gray-800">
                搜索结果
              </Text>
              <Text className="text-xs text-gray-400">
                共 {results.products?.length || 0} 件商品
              </Text>
            </View>
            
            <View className="space-y-3">
              {results.products?.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </View>

            {results.products?.length === 0 && !loading && (
              <View className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Text className="text-4xl mb-2">🔍</Text>
                <Text className="text-sm">未找到相关商品</Text>
                <Text className="text-xs text-gray-400 mt-1">试试其他关键词</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* 默认页面：热门搜索 + 搜索历史 */}
      {!results && !showSuggestions && (
        <ScrollView className="flex-1" scrollY>
          {/* 搜索历史 */}
          {searchHistory.length > 0 && (
            <View className="bg-white px-4 py-3 mb-2">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-sm font-medium text-gray-800">搜索历史</Text>
                <Text className="text-xs text-gray-400" onClick={clearHistory}>清除</Text>
              </View>
              <View className="flex flex-wrap gap-2">
                {searchHistory.map((keyword, index) => (
                  <View
                    key={index}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                    onClick={() => performSearch(keyword)}
                  >
                    <Text>{keyword}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 热门搜索 */}
          <View className="bg-white px-4 py-3">
            <Text className="text-sm font-medium text-gray-800 mb-2">热门搜索</Text>
            <View className="flex flex-wrap gap-2">
              {HOT_SEARCHES.map((keyword, index) => (
                <View
                  key={index}
                  className="px-3 py-1.5 bg-orange-50 text-orange-600 text-xs rounded-full"
                  onClick={() => performSearch(keyword)}
                >
                  <Text>{keyword}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* 加载中 */}
      {loading && (
        <View className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
          <View className="flex flex-col items-center">
            <View className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-2" />
            <Text className="text-sm text-gray-500">搜索中...</Text>
          </View>
        </View>
      )}
    </View>
  )
}
