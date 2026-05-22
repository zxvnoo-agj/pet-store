import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView, Button } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { apiClient } from '../../services/api'
import { useCompareStore } from '../../stores/compareStore'
import { useAuthStore } from '../../stores/authStore'
import { checkLoginStatus } from '../../services/auth'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { Loading } from '../../components/Loading'

function SpuDetailContent() {
  const router = useRouter()
  const { id } = router.params
  const [spu, setSpu] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [isFavorited, setIsFavorited] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'nutrition' | 'reviews'>('overview')
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [loading, setLoading] = useState(true)
  const [, setShowPriceCompare] = useState(false)

  const { addToCompare, isInCompare } = useCompareStore()
  const { isLoggedIn } = useAuthStore()
  const inCompare = id ? isInCompare(Number(id)) : false

  useEffect(() => {
    checkLoginStatus()
    if (id) {
      fetchSpuDetail()
      fetchReviews()
      fetchFavoriteStatus()
      fetchListings()
    }
  }, [id])

  const fetchFavoriteStatus = async () => {
    if (!isLoggedIn || !id) return
    try {
      const res = await apiClient.get(`/spus/${id}/favorite`)
      setIsFavorited(res.is_favorited)
    } catch {
      // 静默处理
    }
  }

  const fetchListings = async () => {
    if (!id) return
    try {
      const res = await apiClient.get(`/spus/${id}/listings`)
      setListings(res.items || [])
    } catch (error) {
      console.error('Failed to fetch listings:', error)
    }
  }

  const toggleFavorite = async () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (!id) return
    try {
      const res = await apiClient.post(`/spus/${id}/favorite`)
      setIsFavorited(res.is_favorited)
      Taro.showToast({
        title: res.is_favorited ? '已收藏' : '已取消收藏',
        icon: 'success',
      })
    } catch (error: any) {
      Taro.showToast({ title: error.message || '操作失败', icon: 'none' })
    }
  }

  const fetchSpuDetail = async () => {
    try {
      const res = await apiClient.get(`/spus/${id}`)
      setSpu(res)
    } catch (error) {
      console.error('Failed to fetch SPU:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const res = await apiClient.get(`/spus/${id}/reviews`)
      setReviews(res.items || [])
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    }
  }

  const goBack = () => {
    Taro.navigateBack()
  }

  const navigateToChat = () => {
    Taro.navigateTo({ url: `/pages/chat/index?spuId=${id}` })
  }

  const navigateToPriceCompare = () => {
    setShowPriceCompare(true)
  }

  const getPetTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      cat: '猫咪',
      dog: '狗狗',
    }
    return map[type] || type
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '暂无报价'
    return `¥${price.toFixed(2)}`
  }

  const getPriceRange = () => {
    if (!spu) return '暂无报价'
    if (spu.price_min && spu.price_max) {
      if (spu.price_min === spu.price_max) {
        return formatPrice(spu.price_min)
      }
      return `${formatPrice(spu.price_min)} ~ ${formatPrice(spu.price_max)}`
    }
    if (spu.price_min) return formatPrice(spu.price_min)
    if (spu.price_max) return formatPrice(spu.price_max)
    return '暂无报价'
  }

  // WeChat sharing
  useShareAppMessage(() => {
    if (!spu) return { title: '宠物用品推荐' }
    return {
      title: `${spu.name} - ${spu.brand || '宠物用品'}`,
      path: `/pages/product/detail?id=${id}`,
      imageUrl: spu.image_urls?.[0] || '',
    }
  })

  useShareTimeline(() => {
    if (!spu) return { title: '宠物用品推荐' }
    return {
      title: `${spu.name} - ${spu.brand || '宠物用品'}`,
      query: `id=${id}`,
      imageUrl: spu.image_urls?.[0] || '',
    }
  })

  if (loading) {
    return <Loading fullScreen text="加载产品详情..." />
  }

  if (!spu) {
    return (
      <View className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Text className="text-4xl mb-2">📦</Text>
        <Text className="text-gray-500">产品不存在或已下架</Text>
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
        {/* 产品图片 */}
        <View className="aspect-square bg-gray-100">
          <Image src={spu.image_urls?.[0] || ''} className="w-full h-full object-cover" />
        </View>

        {/* SPU 基本信息 */}
        <View className="px-4 pt-4 pb-3">
          {/* 品牌标签 */}
          <View className="flex items-center gap-2 mb-2">
            <Text className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded font-medium">
              {spu.brand}
            </Text>
            <Text className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded font-medium">
              {getPetTypeLabel(spu.pet_type)}
            </Text>
            {spu.model && (
              <Text className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-medium">
                型号: {spu.model}
              </Text>
            )}
          </View>

          <View className="flex items-start justify-between gap-2">
            <Text className="text-lg font-bold text-gray-900 leading-tight">{spu.name}</Text>
          </View>

          {/* 价格区间 */}
          <View className="flex items-baseline gap-2 mt-3">
            <Text className="text-2xl font-bold text-orange-600">{getPriceRange()}</Text>
            {listings.length > 0 && (
              <Text className="text-xs text-gray-400">({listings.length}个平台在售)</Text>
            )}
          </View>

          {/* 评分和评价 */}
          <View className="flex items-center gap-4 mt-3">
            <View className="flex items-center gap-1">
              <Text className="text-sm font-bold text-gray-800">⭐ {spu.rating || 0}</Text>
            </View>
            <Text className="text-xs text-gray-400">{spu.review_count || 0}条评价</Text>
            {reviews.length > 0 && (
              <Text className="text-xs text-orange-500 font-medium">{recommendRate}%推荐</Text>
            )}
          </View>

          {/* 分类信息 */}
          {spu.category && (
            <View className="mt-2">
              <Text className="text-xs text-gray-400">
                分类: {spu.category.name}
              </Text>
            </View>
          )}
        </View>

        {/* Tab切换 */}
        <View className="flex border-b border-gray-100 px-4">
          <View
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${
              activeTab === 'overview'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            <Text>产品概览</Text>
          </View>
          <View
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${
              activeTab === 'nutrition'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500'
            }`}
            onClick={() => setActiveTab('nutrition')}
          >
            <Text>营养成分</Text>
          </View>
          <View
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${
              activeTab === 'reviews'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500'
            }`}
            onClick={() => setActiveTab('reviews')}
          >
            <Text>真实评价 ({spu.review_count || 0})</Text>
          </View>
        </View>

        {/* 产品概览 */}
        {activeTab === 'overview' && (
          <View className="px-4 py-4 space-y-4">
            {/* 优点 */}
            {spu.pros && spu.pros.length > 0 && (
              <View>
                <Text className="text-sm font-bold text-green-700 mb-2">✅ 优点</Text>
                <View className="flex flex-wrap gap-2">
                  {spu.pros.map((pro: string, i: number) => (
                    <Text key={i} className="px-3 py-1.5 bg-green-50 text-green-700 text-xs rounded-full font-medium">
                      {pro}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {/* 缺点 */}
            {spu.cons && spu.cons.length > 0 && (
              <View>
                <Text className="text-sm font-bold text-red-600 mb-2">❌ 缺点</Text>
                <View className="flex flex-wrap gap-2">
                  {spu.cons.map((con: string, i: number) => (
                    <Text key={i} className="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-full font-medium">
                      {con}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {/* 成分 */}
            {spu.ingredients && spu.ingredients.length > 0 && (
              <View>
                <Text className="text-sm font-bold text-gray-800 mb-2">🥩 主要成分</Text>
                <View className="flex flex-wrap gap-2">
                  {spu.ingredients.map((ing: string, i: number) => (
                    <Text key={i} className="px-3 py-1.5 bg-gray-50 text-gray-700 text-xs rounded-full">
                      {ing}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {/* 产品描述 */}
            {spu.description && (
              <View>
                <Text className="text-sm font-bold text-gray-800 mb-2">📝 产品描述</Text>
                <Text className="text-xs text-gray-600 leading-relaxed">{spu.description}</Text>
              </View>
            )}

            {/* 额外属性 */}
            {spu.extra_attrs && Object.keys(spu.extra_attrs).length > 0 && (
              <View>
                <Text className="text-sm font-bold text-gray-800 mb-2">📋 产品参数</Text>
                <View className="space-y-2">
                  {Object.entries(spu.extra_attrs).map(([key, value]: [string, any]) => (
                    <View key={key} className="flex justify-between py-2 border-b border-gray-50">
                      <Text className="text-xs text-gray-500">{key}</Text>
                      <Text className="text-xs text-gray-800 font-medium">{String(value)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 多平台价格对比 */}
            {listings.length > 0 && (
              <View>
                <Text className="text-sm font-bold text-gray-800 mb-2">💰 多平台价格</Text>
                <View className="space-y-2">
                  {listings.slice(0, 3).map((listing: any) => (
                    <View key={listing.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <View className="flex items-center gap-2">
                        <Text className="text-xs font-medium text-gray-700">{listing.platform}</Text>
                        <Text className="text-xs text-gray-400">{listing.shop_name}</Text>
                      </View>
                      <View className="flex items-center gap-2">
                        {listing.original_price && listing.original_price > listing.price && (
                          <Text className="text-xs text-gray-400 line-through">
                            ¥{listing.original_price}
                          </Text>
                        )}
                        <Text className="text-sm font-bold text-orange-600">
                          ¥{listing.price}
                        </Text>
                        {listing.sales_count && (
                          <Text className="text-xs text-gray-400">已售{listing.sales_count}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                  {listings.length > 3 && (
                    <View
                      className="text-center py-2 text-xs text-orange-500 font-medium"
                      onClick={navigateToPriceCompare}
                    >
                      <Text>查看全部 {listings.length} 个平台价格 →</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* 营养成分 */}
        {activeTab === 'nutrition' && (
          <View className="px-4 py-4 space-y-4">
            {spu.nutrition && Object.keys(spu.nutrition).length > 0 ? (
              <View>
                <Text className="text-sm font-bold text-gray-800 mb-3">🥗 营养成分表</Text>
                <View className="bg-gray-50 rounded-xl p-4 space-y-3">
                  {Object.entries(spu.nutrition).map(([key, value]: [string, any]) => (
                    <View key={key} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <Text className="text-xs text-gray-600">{key}</Text>
                      <Text className="text-xs font-medium text-gray-800">{String(value)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View className="flex flex-col items-center justify-center py-20">
                <Text className="text-4xl mb-2">🥗</Text>
                <Text className="text-gray-400 text-sm">暂无营养成分信息</Text>
              </View>
            )}

            {/* 成分列表（再次展示） */}
            {spu.ingredients && spu.ingredients.length > 0 && (
              <View className="mt-4">
                <Text className="text-sm font-bold text-gray-800 mb-2">🥩 成分说明</Text>
                <Text className="text-xs text-gray-600 leading-relaxed">
                  {spu.ingredients.join('、')}
                </Text>
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
                  {spu.rating || 0}
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
        {listings.length > 0 ? (
          <View 
            className="flex-1 bg-gray-900 text-white text-sm font-medium py-2.5 rounded-full text-center" 
            onClick={navigateToPriceCompare}
          >
            <Text>查看价格 ({listings.length}个平台)</Text>
          </View>
        ) : (
          <View className="flex-1 bg-gray-300 text-white text-sm font-medium py-2.5 rounded-full text-center">
            <Text>暂无售卖</Text>
          </View>
        )}
      </View>
    </View>
  )
}

export default function SpuDetailPage() {
  return (
    <ErrorBoundary>
      <SpuDetailContent />
    </ErrorBoundary>
  )
}
