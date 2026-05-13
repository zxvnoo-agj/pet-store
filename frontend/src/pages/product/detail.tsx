import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView, Button } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { apiClient } from '../../services/api'
import { useCompareStore } from '../../stores/compareStore'
import { useAuthStore } from '../../stores/authStore'
import { checkLoginStatus } from '../../services/auth'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { Loading } from '../../components/Loading'

function ProductDetailContent() {
  const router = useRouter()
  const { id } = router.params
  const [product, setProduct] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [isFavorited, setIsFavorited] = useState(false)
  const [activeTab, setActiveTab] = useState<'pros_cons' | 'reviews'>('pros_cons')
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [loading, setLoading] = useState(true)

  const { addToCompare, isInCompare } = useCompareStore()
  const { isLoggedIn } = useAuthStore()
  const inCompare = id ? isInCompare(Number(id)) : false

  useEffect(() => {
    checkLoginStatus()
    if (id) {
      fetchProductDetail()
      fetchReviews()
      fetchFavoriteStatus()
    }
  }, [id])

  const fetchFavoriteStatus = async () => {
    if (!isLoggedIn || !id) return
    try {
      const res = await apiClient.get(`/products/${id}/favorite`)
      setIsFavorited(res.is_favorited)
    } catch {
      // 静默处理
    }
  }

  const toggleFavorite = async () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (!id) return
    try {
      const res = await apiClient.post(`/products/${id}/favorite`)
      setIsFavorited(res.is_favorited)
      Taro.showToast({
        title: res.is_favorited ? '已收藏' : '已取消收藏',
        icon: 'success',
      })
    } catch (error: any) {
      Taro.showToast({ title: error.message || '操作失败', icon: 'none' })
    }
  }

  const fetchProductDetail = async () => {
    try {
      const res = await apiClient.get(`/products/${id}`)
      setProduct(res.product)
    } catch (error) {
      console.error('Failed to fetch product:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const res = await apiClient.get(`/products/${id}/reviews`)
      setReviews(res.reviews || [])
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    }
  }

  const goBack = () => {
    Taro.navigateBack()
  }

  const navigateToChat = () => {
    Taro.navigateTo({ url: `/pages/chat/index?productId=${id}` })
  }

  // WeChat sharing
  useShareAppMessage(() => {
    if (!product) return { title: '宠物用品推荐' }
    return {
      title: `${product.name} - ${product.brand || '宠物用品'}`,
      path: `/pages/product/detail?id=${id}`,
      imageUrl: product.image_urls?.[0] || '',
    }
  })

  useShareTimeline(() => {
    if (!product) return { title: '宠物用品推荐' }
    return {
      title: `${product.name} - ${product.brand || '宠物用品'}`,
      query: `id=${id}`,
      imageUrl: product.image_urls?.[0] || '',
    }
  })

  if (loading) {
    return <Loading fullScreen text="加载商品详情..." />
  }

  if (!product) {
    return (
      <View className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Text className="text-4xl mb-2">📦</Text>
        <Text className="text-gray-500">商品不存在或已下架</Text>
      </View>
    )
  }

  const recommendRate = Math.round(
    (reviews.filter((r: any) => r.is_recommended).length / (reviews.length || 1)) * 100
  )

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3)

  return (
    <View className="flex flex-col h-screen bg-white">
      {/* 导航栏 */}
      <View className="shrink-0 absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3">
        <View
          className="w-9 h-9 bg-black/40 rounded-full flex items-center justify-center"
          onClick={goBack}
        >
          <Text className="text-white">←</Text>
        </View>
        <View className="flex gap-2">
          <View
            className="w-9 h-9 bg-black/40 rounded-full flex items-center justify-center"
            onClick={toggleFavorite}
          >
            <Text className={isFavorited ? 'text-red-400' : 'text-white'}>{isFavorited ? '❤️' : '🤍'}</Text>
          </View>
          <View className="w-9 h-9 bg-black/40 rounded-full flex items-center justify-center">
            <Button openType="share" className="w-full h-full flex items-center justify-center bg-transparent text-white text-sm">
              ↗️
            </Button>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" scrollY>
        {/* 商品图片 */}
        <View className="aspect-square bg-gray-100">
          <Image src={product.image_urls?.[0] || ''} className="w-full h-full object-cover" />
        </View>

        {/* 基本信息 */}
        <View className="px-4 pt-4 pb-3">
          <View className="flex items-start justify-between gap-2">
            <Text className="text-lg font-bold text-gray-900 leading-tight">{product.name}</Text>
          </View>
          <Text className="text-sm text-gray-500 mt-1">{product.brand}</Text>

          <View className="flex items-baseline gap-2 mt-2">
            <Text className="text-2xl font-bold text-orange-600">
              ¥{product.price_range?.min || product.price_min}
            </Text>
            {product.price_range?.max > product.price_range?.min && (
              <>
                <Text className="text-gray-400">~</Text>
                <Text className="text-lg text-orange-500">¥{product.price_range?.max}</Text>
              </>
            )}
          </View>

          <View className="flex items-center gap-4 mt-3">
            <View className="flex items-center gap-1">
              <Text className="text-sm font-bold text-gray-800">⭐ {product.ratings?.overall || 0}</Text>
            </View>
            <Text className="text-xs text-gray-400">{product.review_count || 0}条评价</Text>
            <Text className="text-xs text-orange-500 font-medium">{recommendRate}%推荐</Text>
          </View>
        </View>

        {/* Tab切换 */}
        <View className="flex border-b border-gray-100 px-4">
          <View
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${
              activeTab === 'pros_cons'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500'
            }`}
            onClick={() => setActiveTab('pros_cons')}
          >
            <Text>优缺点</Text>
          </View>
          <View
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${
              activeTab === 'reviews'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500'
            }`}
            onClick={() => setActiveTab('reviews')}
          >
            <Text>真实评价 ({product.review_count || 0})</Text>
          </View>
        </View>

        {/* 优缺点内容 */}
        {activeTab === 'pros_cons' && (
          <View className="px-4 py-4 space-y-4">
            <View>
              <Text className="text-sm font-bold text-green-700 mb-2">✅ 优点</Text>
              <View className="flex flex-wrap gap-2">
                {product.pros?.map((pro: string, i: number) => (
                  <Text key={i} className="px-3 py-1.5 bg-green-50 text-green-700 text-xs rounded-full font-medium">
                    {pro}
                  </Text>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-sm font-bold text-red-600 mb-2">❌ 缺点</Text>
              <View className="flex flex-wrap gap-2">
                {product.cons?.map((con: string, i: number) => (
                  <Text key={i} className="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-full font-medium">
                    {con}
                  </Text>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-sm font-bold text-gray-800 mb-3">评分详情</Text>
              <View className="space-y-2.5">
                {[
                  { label: '综合评分', value: product.ratings?.overall || 0 },
                  { label: '性价比', value: product.ratings?.cost_performance || 0 },
                  { label: '产品质量', value: product.ratings?.quality || 0 },
                  { label: '适口性', value: product.ratings?.taste || 0 },
                ].map((item) => (
                  <View key={item.label} className="flex items-center gap-3">
                    <Text className="text-xs text-gray-500 w-16">{item.label}</Text>
                    <View className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-orange-400 rounded-full"
                        style={{ width: `${(item.value / 5) * 100}%` }}
                      />
                    </View>
                    <Text className="text-xs font-medium text-gray-700 w-8 text-right">
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {product.ingredients?.length > 0 && (
              <View>
                <Text className="text-sm font-bold text-gray-800 mb-2">成分</Text>
                <Text className="text-xs text-gray-600 leading-relaxed">
                  {product.ingredients.join('、')}
                </Text>
              </View>
            )}

            {product.description && (
              <View>
                <Text className="text-sm font-bold text-gray-800 mb-2">商品描述</Text>
                <Text className="text-xs text-gray-600 leading-relaxed">{product.description}</Text>
              </View>
            )}
          </View>
        )}

        {/* 评价内容 */}
        {activeTab === 'reviews' && (
          <View className="px-4 py-4 space-y-4">
            <View className="bg-gray-50 rounded-xl p-3">
              <View className="flex items-center justify-between mb-2">
                <Text className="text-lg font-bold text-gray-800">
                  {product.ratings?.overall || 0}
                  <Text className="text-sm text-gray-400 font-normal">/5</Text>
                </Text>
                <Text className="text-xs text-orange-500 font-medium">
                  {recommendRate}% 的人推荐
                </Text>
              </View>
              <View className="flex flex-wrap gap-1.5">
                {['适口性好', '营养均衡', '性价比高', '便便正常', '毛色变亮'].map((tag) => (
                  <Text key={tag} className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] rounded-full">
                    {tag}
                  </Text>
                ))}
              </View>
            </View>

            {displayedReviews.map((review: any) => (
              <View key={review.id} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                <View className="flex items-center gap-2 mb-2">
                  <View className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                    <Text className="text-xs font-bold text-orange-600">{review.user?.nickname?.[0] || 'U'}</Text>
                  </View>
                  <Text className="text-xs font-medium text-gray-700">{review.user?.nickname || '匿名用户'}</Text>
                  <View className="ml-auto flex items-center gap-0.5">
                    <Text className="text-xs text-orange-400">{'⭐'.repeat(Math.round(review.rating || 0))}</Text>
                  </View>
                </View>
                <Text className="text-xs text-gray-600 leading-relaxed">{review.content}</Text>
                <View className="flex flex-wrap gap-1.5 mt-2">
                  {review.tags?.map((tag: string) => (
                    <Text key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded">
                      #{tag}
                    </Text>
                  ))}
                </View>
                <View className="flex items-center justify-between mt-2">
                  <Text className="text-[10px] text-gray-400">{review.created_at}</Text>
                  <View className="flex items-center gap-1 text-gray-400">
                    <Text className="text-[10px]">👍 {review.helpful_count || 0}</Text>
                  </View>
                </View>
              </View>
            ))}

            {!showAllReviews && reviews.length > 3 && (
              <View
                className="w-full py-2.5 text-xs text-orange-500 font-medium border border-orange-200 rounded-xl text-center"
                onClick={() => setShowAllReviews(true)}
              >
                <Text>查看全部 {reviews.length} 条评价</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 底部操作栏 */}
      <View className="shrink-0 px-4 py-2.5 bg-white border-t border-gray-100 flex items-center gap-3 z-10">
        <View
          className="flex flex-col items-center gap-0.5 px-2"
          onClick={navigateToChat}
        >
          <Text className="text-orange-500 text-lg">🤖</Text>
          <Text className="text-[10px] text-gray-500">问AI</Text>
        </View>
        <View
          className={`flex-1 text-white text-sm font-medium py-2.5 rounded-full text-center ${
            inCompare ? 'bg-orange-300' : 'bg-orange-500'
          }`}
          onClick={() => id && addToCompare(Number(id))}
        >
          <Text>{inCompare ? '已加入对比' : '加入对比'}</Text>
        </View>
        <View className="flex-1 bg-gray-900 text-white text-sm font-medium py-2.5 rounded-full text-center">
          <Text>去购买</Text>
        </View>
      </View>
    </View>
  )
}

export default function ProductDetailPage() {
  return (
    <ErrorBoundary>
      <ProductDetailContent />
    </ErrorBoundary>
  )
}
