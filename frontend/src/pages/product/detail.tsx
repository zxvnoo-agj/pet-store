import React, { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView, Button } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { apiClient, getSpuReviews, AiReviewSummary, XHSNote } from '../../services/api'
import { useCompareStore } from '../../stores/compareStore'
import { useAuthStore } from '../../stores/authStore'
import { checkLoginStatus } from '../../services/auth'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { Loading } from '../../components/Loading'
import { FavoriteIcon, FavoriteFilledIcon, ShareIcon, AiAssistantIcon } from '../../components/Icons'

function PurchaseButton({ listingId, spuId }: { listingId: number; spuId: number }) {
  const [loading, setLoading] = useState(false)

  const handlePurchase = async () => {
    setLoading(true)
    try {
      const res = await apiClient.post(`/spus/${spuId}/promotion-url`, { listing_id: listingId })
      if (res.short_url) {
        Taro.setClipboardData({ data: res.short_url })
        Taro.showModal({
          title: '链接已复制',
          content: '推广链接已复制到剪贴板，请在浏览器中打开',
          showCancel: false,
        })
      } else {
        Taro.showToast({ title: '链接生成失败', icon: 'none' })
      }
    } catch (error: any) {
      const msg = error.message || '生成失败'
      if (msg.includes('暂不可用')) {
        Taro.showToast({ title: '商品暂不可用', icon: 'none' })
      } else if (msg.includes('繁忙')) {
        Taro.showToast({ title: '服务繁忙，请稍后重试', icon: 'none' })
      } else {
        Taro.showToast({ title: '生成推广链接失败', icon: 'none' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View
      className={`w-full py-2.5 rounded-full text-center ${
        loading ? 'bg-gray-300' : 'bg-orange-500'
      }`}
      onClick={loading ? undefined : handlePurchase}
    >
      <Text className="text-white text-sm font-medium">
        {loading ? '生成中...' : '去购买'}
      </Text>
    </View>
  )
}

const SERVICE_TAG_MAP: Record<number, string> = {
  2: '包邮',
  13: '官方店铺',
  15: '品牌好货',
  24: '隔日达',
}

function SpuDetailContent() {
  const router = useRouter()
  const { id } = router.params
  const [spu, setSpu] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [aiSummary, setAiSummary] = useState<AiReviewSummary | null>(null)
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewTotal, setReviewTotal] = useState(0)
  const [reviewTotalPages, setReviewTotalPages] = useState(1)
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<number>>(new Set())
  const [isFavorited, setIsFavorited] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'reviews'>('overview')
  
  const [loading, setLoading] = useState(true)

  const [imageExpanded, setImageExpanded] = useState(false)

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

  const fetchReviews = async (page: number = 1) => {
    try {
      const res = await getSpuReviews(Number(id), page)
      if (page === 1) {
        setReviews(res.notes || [])
      } else {
        setReviews(prev => [...prev, ...(res.notes || [])])
      }
      setAiSummary(res.ai_summary || null)
      setReviewPage(res.pagination.page)
      setReviewTotal(res.pagination.total)
      setReviewTotalPages(res.pagination.total_pages)
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    }
  }

  const toggleNoteComments = (noteId: number) => {
    setExpandedNoteIds(prev => {
      const next = new Set(prev)
      if (next.has(noteId)) {
        next.delete(noteId)
      } else {
        next.add(noteId)
      }
      return next
    })
  }

  const loadMoreReviews = () => {
    const nextPage = reviewPage + 1
    fetchReviews(nextPage)
  }

  const navigateToChat = () => {
    if (id) {
      Taro.setStorageSync('pendingSpuId', id)
    }
    Taro.switchTab({ url: '/pages/chat/index' })
  }

  const navigateToPriceCompare = () => {
    setActiveTab('links')
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
        <Text className="text-4xl mb-2"></Text>
        <Text className="text-gray-500">产品不存在或已下架</Text>
      </View>
    )
  }

  const recommendRate = Math.round(
    (reviews.filter((r: any) => r.is_recommended).length / (reviews.length || 1)) * 100
  )
  const heroImage = spu.image_urls?.[0] || ''

  

  return (
    <View className="flex flex-col h-screen bg-[#fff8f2]">
      <ScrollView className="flex-1" scrollY style={{ paddingBottom: '60px' }}>
        {/* 产品图片 */}
        <View
          className="bg-orange-50 flex items-center justify-center overflow-hidden"
          style={{ height: imageExpanded ? '420px' : '240px' }}
        >
          {heroImage ? (
            <Image
              src={heroImage}
              className="w-full h-full"
              mode={imageExpanded ? 'aspectFit' : 'aspectFill'}
              lazyLoad
            />
          ) : (
            <View className="w-full h-full flex items-center justify-center">
              <Text className="text-sm text-orange-300">暂无商品图片</Text>
            </View>
          )}
        </View>
        {/* 展开/折叠图片按钮 */}
        <View className="flex items-center justify-center py-2 bg-white">
          <View
            className="flex items-center gap-1 px-4 py-1.5 bg-orange-50 rounded-full mini-press"
            onClick={() => setImageExpanded(!imageExpanded)}
          >
            <Text className="text-xs text-orange-600">{imageExpanded ? '收起图片' : '展开查看完整图片'}</Text>
            <Text className="text-xs text-orange-400">{imageExpanded ? '▲' : '▼'}</Text>
          </View>
        </View>

        {/* SPU 基本信息 */}
        <View className="mx-4 mt-3 px-4 pt-4 pb-4 bg-white rounded-3xl border border-orange-100 mini-card mini-fade-up">
          <View className="flex items-start justify-between gap-3 mb-2">
            {/* 品牌标签 */}
            <View className="flex-1 flex flex-wrap items-center gap-2">
              <Text className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-medium">
                {spu.brand}
              </Text>
              <Text className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full font-medium">
                {getPetTypeLabel(spu.pet_type)}
              </Text>
              {spu.model && (
                <Text className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                  型号: {spu.model}
                </Text>
              )}
            </View>
            <View className="flex items-center gap-2 shrink-0">
              <View
                className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center mini-press"
                onClick={toggleFavorite}
              >
                {isFavorited ? (
                  <FavoriteFilledIcon size={18} color="#f87171" />
                ) : (
                  <FavoriteIcon size={18} color="#f97316" />
                )}
              </View>
              <Button openType="share" className="mini-share-button w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center">
                <ShareIcon size={16} color="#6b7280" />
              </Button>
            </View>
          </View>

          <View className="flex items-start justify-between gap-2">
                <Text className="text-lg font-bold text-gray-900 leading-tight" userSelect>{spu.name}</Text>
          </View>

          {/* 价格区间 */}
          <View className="flex items-baseline gap-2 mt-3">
            <Text className="text-3xl font-bold text-orange-600">{getPriceRange()}</Text>
            {listings.length > 0 && (
              <Text className="text-xs text-gray-400">({listings.length}个平台在售)</Text>
            )}
          </View>

          {/* 评分和评价 */}
          <View className="grid grid-cols-3 gap-2 mt-4">
            <View className="bg-orange-50 rounded-2xl px-3 py-2">
              <Text className="text-sm font-bold text-orange-600">{spu.rating || 0}</Text>
              <Text className="text-[10px] text-orange-700/60 mt-0.5">综合评分</Text>
            </View>
            <View className="bg-blue-50 rounded-2xl px-3 py-2">
              <Text className="text-sm font-bold text-blue-600">{spu.review_count || 0}</Text>
              <Text className="text-[10px] text-blue-700/60 mt-0.5">条评价</Text>
            </View>
            <View className="bg-green-50 rounded-2xl px-3 py-2">
              <Text className="text-sm font-bold text-green-600">{reviews.length > 0 ? `${recommendRate}%` : '-'}</Text>
              <Text className="text-[10px] text-green-700/60 mt-0.5">推荐率</Text>
            </View>
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
        <View className="flex border-b border-orange-100 px-4 mt-3 bg-white">
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
              activeTab === 'links'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500'
            }`}
            onClick={() => setActiveTab('links')}
          >
            <Text>商品链接</Text>
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
              <View className="bg-white rounded-3xl p-4 border border-green-100 mini-card">
                <Text className="text-sm font-bold text-green-700 mb-2">优点</Text>
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
              <View className="bg-white rounded-3xl p-4 border border-red-100 mini-card">
                <Text className="text-sm font-bold text-red-600 mb-2">缺点</Text>
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
              <View className="bg-white rounded-3xl p-4 border border-gray-100 mini-card">
                <Text className="text-sm font-bold text-gray-800 mb-2">主要成分</Text>
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
              <View className="bg-white rounded-3xl p-4 border border-gray-100 mini-card">
                <Text className="text-sm font-bold text-gray-800 mb-2">产品描述</Text>
                <Text className="text-xs text-gray-600 leading-relaxed" userSelect>{spu.description}</Text>
              </View>
            )}

            {/* 营养成分 */}
            {spu.nutrition && Object.keys(spu.nutrition).length > 0 && (
              <View className="bg-white rounded-3xl p-4 border border-gray-100 mini-card">
                <Text className="text-sm font-bold text-gray-800 mb-2">营养成分</Text>
                <View className="bg-gray-50 rounded-xl p-4 space-y-3">
                  {Object.entries(spu.nutrition).map(([key, value]: [string, any]) => (
                    <View key={key} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <Text className="text-xs text-gray-600">{key}</Text>
                      <Text className="text-xs font-medium text-gray-800">{String(value)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 额外属性 */}
            {spu.extra_attrs && Object.keys(spu.extra_attrs).length > 0 && (
              <View>
                <Text className="text-sm font-bold text-gray-800 mb-2">产品参数</Text>
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
                <Text className="text-sm font-bold text-gray-800 mb-2">多平台价格</Text>
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

        {/* 商品链接 */}
        {activeTab === 'links' && (
          <View className="px-4 py-4 space-y-4">
            {listings.length === 0 ? (
              <View className="flex flex-col items-center justify-center py-20">
                <Text className="text-gray-400 text-sm">暂无商品链接</Text>
                <Text className="text-xs text-gray-300 mt-2">该商品暂无在售链接</Text>
              </View>
            ) : (
              listings.map((listing: any) => (
                <View key={listing.id} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                  {/* 店铺和平台信息 */}
                  <View className="flex items-center justify-between">
                    <View className="flex items-center gap-2">
                      <Text className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded">{listing.platform}</Text>
                      <Text className="text-sm font-medium text-gray-800">{listing.shop_name}</Text>
                    </View>
                    {listing.sales_count && (
                      <Text className="text-xs text-gray-400">已售 {listing.sales_count}</Text>
                    )}
                  </View>
                  
                  {/* 标题和价格 */}
                  <Text className="text-sm text-gray-700">{listing.title}</Text>
                  <View className="flex items-baseline gap-2">
                    <Text className="text-lg font-bold text-orange-500">¥{listing.price}</Text>
                    {listing.original_price && (
                      <Text className="text-sm text-gray-400 line-through">¥{listing.original_price}</Text>
                    )}
                  </View>
                  
                  {/* 服务标签 */}
                  {listing.service_tags && listing.service_tags.length > 0 && (
                    <View className="flex flex-wrap gap-1.5">
                      {listing.service_tags.map((tag: number | string) => (
                        <Text key={tag} className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded">
                          {SERVICE_TAG_MAP[tag as number] || tag}
                        </Text>
                      ))}
                    </View>
                  )}
                  
                  {/* SKU 规格 */}
                  {listing.sku_specs && listing.sku_specs.length > 0 && (
                    <View className="space-y-2">
                      <Text className="text-xs text-gray-500">规格选择</Text>
                      <View className="flex flex-wrap gap-2">
                        {listing.sku_specs.map((sku: any, idx: number) => (
                          <View 
                            key={idx}
                            className="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <Text className="text-xs text-gray-700">{sku.spec}</Text>
                            <Text className="text-xs text-orange-500">¥{sku.price}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  
                  {/* 购买按钮 */}
                  <PurchaseButton listingId={listing.id} spuId={Number(id)} />
                </View>
              ))
            )}
          </View>
        )}

        {/* 评价内容 - 小红书笔记 */}
        {activeTab === 'reviews' && (
          <View className="px-4 py-4 space-y-4">
            {/* AI 总结卡片 */}
            {aiSummary ? (
              <View className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-2xl p-4 border border-purple-100">
                <View className="flex items-center gap-2 mb-3">
                  <View className="w-2 h-2 rounded-full bg-purple-400" />
                  <Text className="text-sm font-bold text-purple-700">AI 综合总结</Text>
                  <Text className="text-[10px] text-gray-400 ml-auto">
                    基于 {aiSummary.review_count} 条笔记
                  </Text>
                </View>

                <Text className="text-xs text-gray-700 leading-relaxed mb-3">{aiSummary.summary}</Text>

                {aiSummary.overall_pros.length > 0 && (
                  <View className="mb-2">
                    <Text className="text-[10px] font-medium text-green-600 mb-1">优点</Text>
                    <View className="flex flex-wrap gap-1.5">
                      {aiSummary.overall_pros.map((pro, i) => (
                        <Text key={i} className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full">
                          {pro}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                {aiSummary.overall_cons.length > 0 && (
                  <View className="mb-2">
                    <Text className="text-[10px] font-medium text-red-500 mb-1">缺点</Text>
                    <View className="flex flex-wrap gap-1.5">
                      {aiSummary.overall_cons.map((con, i) => (
                        <Text key={i} className="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] rounded-full">
                          {con}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                <View className="flex items-center gap-2 mt-2 pt-2 border-t border-white/50">
                  <Text className={`text-xs font-medium ${aiSummary.recommendation === '推荐' ? 'text-green-600' : aiSummary.recommendation === '不推荐' ? 'text-red-500' : 'text-gray-500'}`}>
                    {aiSummary.recommendation === '推荐' ? '推荐' : aiSummary.recommendation === '不推荐' ? '不推荐' : '中性'}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    推荐率 {Math.round(aiSummary.recommend_rate * 100)}%
                  </Text>
                </View>
              </View>
            ) : (
              <View className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-2xl p-4 border border-purple-100/30">
                <View className="flex items-center gap-2 mb-1">
                  <View className="w-2 h-2 rounded-full bg-purple-300" />
                  <Text className="text-sm font-bold text-purple-400">AI 综合总结</Text>
                </View>
                <Text className="text-xs text-gray-400">暂无 AI 总结，评论采集后将自动生成</Text>
              </View>
            )}

            {/* 笔记列表 */}
            {reviews.length === 0 ? (
              <View className="flex flex-col items-center justify-center py-10">
                <Text className="text-gray-400 text-sm">暂无小红书笔记</Text>
                <Text className="text-xs text-gray-300 mt-1">管理员采集后将在此展示</Text>
              </View>
            ) : (
              reviews.map((note: XHSNote) => {
                const isExpanded = expandedNoteIds.has(note.id)
                const truncated = note.content.length > 200
                return (
                  <View key={note.id} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                    {/* 作者和信息头 */}
                    <View className="flex items-center gap-2">
                      <View className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <Text className="text-xs font-bold text-purple-600">{note.author?.[0] || '?'}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-medium text-gray-700">{note.author || '匿名'}</Text>
                        <Text className="text-[10px] text-gray-400">
                          {note.note_published_at ? new Date(note.note_published_at).toLocaleDateString('zh-CN') : ''}
                        </Text>
                      </View>
                      <View className="flex items-center gap-1">
                        <Text className="text-xs text-gray-400">赞 {note.note_likes || 0}</Text>
                      </View>
                    </View>

                    {/* 笔记内容 */}
                    <Text className={`text-xs text-gray-600 leading-relaxed ${isExpanded || !truncated ? '' : 'line-clamp-3'}`}>
                      {isExpanded ? note.content : (truncated ? note.content.slice(0, 200) + '...' : note.content)}
                    </Text>
                    {truncated && (
                      <Text
                        className="text-[10px] text-purple-500 font-medium"
                        onClick={() => toggleNoteComments(note.id)}
                      >
                        {isExpanded ? '收起' : '展开全文'}
                      </Text>
                    )}

                    {/* Tags */}
                    {note.tags.length > 0 && (
                      <View className="flex flex-wrap gap-1.5">
                        {note.tags.slice(0, 4).map((tag, i) => (
                          <Text key={i} className="px-1.5 py-0.5 bg-orange-50 text-orange-500 text-[10px] rounded">
                            #{tag}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* 推荐态度 */}
                    {note.is_recommended !== null && note.is_recommended !== undefined && (
                      <Text className={`text-[10px] ${note.is_recommended ? 'text-green-500' : 'text-red-400'}`}>
                        {note.is_recommended ? '推荐' : '不推荐'}
                      </Text>
                    )}

                    {/* 来源链接 */}
                    {note.source_url && (
                      <Text
                        className="text-[10px] text-blue-500 underline"
                        onClick={() => Taro.setClipboardData({ data: note.source_url || '' })}
                      >
                        查看小红书原文
                      </Text>
                    )}

                    {/* 评论折叠区域 */}
                    {note.comments.length > 0 && (
                      <View
                        className="bg-gray-50 rounded-xl p-3 mt-1"
                        onClick={() => toggleNoteComments(note.id + 100000)}
                      >
                        <View className="flex items-center justify-between mb-1">
                          <Text className="text-[10px] font-medium text-gray-500">
                            评论 ({note.comments.length})
                          </Text>
                          <Text className="text-[10px] text-gray-400">
                            {expandedNoteIds.has(note.id + 100000) ? '收起 ▲' : '展开 ▼'}
                          </Text>
                        </View>
                        {expandedNoteIds.has(note.id + 100000) && (
                          <View className="space-y-2">
                            {note.comments.slice(0, 10).map((comment, i) => (
                              <Text key={i} className="text-[10px] text-gray-600 leading-relaxed block">
                                {comment}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )
              })
            )}

            {/* 加载更多 */}
            {reviewPage < reviewTotalPages && (
              <View
                className="w-full py-2.5 text-xs text-orange-500 font-medium border border-orange-200 rounded-xl text-center"
                onClick={loadMoreReviews}
              >
                <Text>加载更多笔记</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 底部操作栏 */}
      <View className="shrink-0 px-4 py-2.5 bg-white border-t border-gray-100 flex items-center gap-3 z-10 fixed bottom-0 left-0 right-0" style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
        <View
          className="flex flex-col items-center gap-0.5 px-2"
          onClick={navigateToChat}
        >
          <AiAssistantIcon size={22} color="#f97316" />
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
            <Text>查看价格</Text>
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
