import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import ProductCard from '../../components/ProductCard'
import { useProductStore } from '../../stores/productStore'
import { apiClient } from '../../services/api'

type SortType = 'default' | 'price_asc' | 'price_desc' | 'rating_desc'

export default function ProductListPage() {
  const router = useRouter()
  const { params } = router
  const [sortBy, setSortBy] = useState<SortType>('default')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  const petType = params?.petType || ''
  const category = params?.category || ''
  const searchQuery = params?.search || ''

  useEffect(() => {
    fetchProducts()
  }, [petType, category, searchQuery, sortBy])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const query: any = { page: 1, page_size: 20 }
      if (petType) query.pet_type = petType
      if (category) query.category_id = category
      if (sortBy !== 'default') query.sort = sortBy

      const res = await apiClient.get('/products', query)
      setProducts(res.products || [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
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
    { key: 'rating_desc', label: '评分最高' },
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
        <Text className="text-xs text-gray-400">共 {products.length} 件商品</Text>
      </View>

      {/* 商品列表 */}
      <View className="flex-1 overflow-y-auto px-4 pb-4">
        <View className="space-y-3">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </View>

        {products.length === 0 && !loading && (
          <View className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Text className="text-sm mt-3">暂无相关商品</Text>
          </View>
        )}
      </View>
    </View>
  )
}
