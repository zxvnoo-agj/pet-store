import { useState, useEffect } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import ProductCard from '../../components/ProductCard'
import { apiClient } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

export default function FavoritesPage() {
  const [products, setProducts] = useState([])
  const { isLoggedIn } = useAuthStore()

  useEffect(() => {
    if (isLoggedIn) {
      fetchFavorites()
    }
  }, [isLoggedIn])

  const fetchFavorites = async () => {
    try {
      const res = await apiClient.get('/users/me/favorites')
      setProducts(res.products || [])
    } catch (error) {
      console.error('Failed to fetch favorites:', error)
    }
  }

  const goBack = () => {
    Taro.navigateBack()
  }

  if (!isLoggedIn) {
    return (
      <View className="flex flex-col items-center justify-center h-screen text-gray-400">
        <Text className="text-sm">请先登录</Text>
        <View
          className="mt-4 px-6 py-2 bg-orange-500 text-white text-sm rounded-full"
          onClick={() => Taro.navigateTo({ url: '/pages/mine/index' })}
        >
          <Text>去登录</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex flex-col h-screen bg-gray-50">
      <View className="shrink-0 bg-white px-4 py-2.5 flex items-center gap-3 border-b border-gray-100">
        <Text className="text-gray-600" onClick={goBack}>←</Text>
        <Text className="flex-1 text-sm font-bold text-gray-800">我的收藏</Text>
      </View>

      <View className="flex-1 overflow-y-auto px-4 py-4">
        <View className="space-y-3">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </View>

        {products.length === 0 && (
          <View className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Text className="text-sm">暂无收藏商品</Text>
          </View>
        )}
      </View>
    </View>
  )
}
