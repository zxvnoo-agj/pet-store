import { useEffect } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCompareStore } from '../../stores/compareStore'

interface CompareProduct {
  id: number
  name: string
  brand: string
  price_range?: { min: number; max: number }
  image_urls?: string[]
  ratings?: Record<string, number>
  pros?: string[]
  cons?: string[]
  review_count?: number
  specifications?: Record<string, string>
}

export default function ComparePage() {
  const {
    compareList,
    products,
    loading,
    dimensions,
    removeFromCompare,
    clearCompare,
    fetchCompareData,
  } = useCompareStore()

  useEffect(() => {
    fetchCompareData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareList.length])

  const goBack = () => {
    Taro.navigateBack()
  }

  const navigateToProductList = () => {
    Taro.switchTab({ url: '/pages/index/index' })
  }

  const navigateToDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/product/detail?id=${id}` })
  }

  const getRatingValue = (product: CompareProduct, key: string) => {
    return product.ratings?.[key] ?? 0
  }

  const renderRatingBar = (value: number) => (
    <View className="flex items-center gap-2">
      <View className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <View
          className="h-full bg-orange-400 rounded-full"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </View>
      <Text className="text-xs font-medium text-gray-700 w-6 text-right">{value}</Text>
    </View>
  )

  const getAttributeValue = (product: CompareProduct, dimension: string) => {
    switch (dimension) {
      case '品牌':
        return product.brand || '-'
      case '价格区间':
        return product.price_range
          ? `¥${product.price_range.min} ~ ¥${product.price_range.max}`
          : '-'
      case '适口性':
        return renderRatingBar(getRatingValue(product, 'taste'))
      case '营养均衡':
        return renderRatingBar(getRatingValue(product, 'nutrition') || getRatingValue(product, 'overall'))
      case '性价比':
        return renderRatingBar(getRatingValue(product, 'cost_performance'))
      default:
        return product.specifications?.[dimension] || '-'
    }
  }

  const isRatingDimension = (dimension: string) => {
    return ['适口性', '营养均衡', '性价比'].includes(dimension)
  }

  if (loading) {
    return (
      <View className="flex items-center justify-center h-screen bg-gray-50">
        <Text className="text-gray-400 text-sm">加载中...</Text>
      </View>
    )
  }

  if (compareList.length === 0) {
    return (
      <View className="flex flex-col h-screen bg-gray-50">
        <View className="shrink-0 bg-white px-4 py-3 flex items-center border-b border-gray-100">
          <Text className="text-gray-600 text-lg" onClick={goBack}>←</Text>
          <Text className="flex-1 text-center text-base font-bold text-gray-800">商品对比</Text>
          <View className="w-6" />
        </View>

        <View className="flex-1 flex flex-col items-center justify-center px-8">
          <View className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Text className="text-3xl">📊</Text>
          </View>
          <Text className="text-base font-bold text-gray-700 mb-2">对比栏为空</Text>
          <Text className="text-sm text-gray-400 text-center mb-6">
            添加 2-4 个商品进行对比，帮你选出最合适的产品
          </Text>
          <View
            className="px-6 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-full"
            onClick={navigateToProductList}
          >
            <Text>去挑选商品</Text>
          </View>
        </View>
      </View>
    )
  }

  if (compareList.length === 1) {
    return (
      <View className="flex flex-col h-screen bg-gray-50">
        <View className="shrink-0 bg-white px-4 py-3 flex items-center border-b border-gray-100">
          <Text className="text-gray-600 text-lg" onClick={goBack}>←</Text>
          <Text className="flex-1 text-center text-base font-bold text-gray-800">商品对比</Text>
          <View className="w-6" />
        </View>

        <View className="flex-1 flex flex-col items-center justify-center px-8">
          <Text className="text-base font-bold text-gray-700 mb-2">还需添加 1 个商品</Text>
          <Text className="text-sm text-gray-400 text-center mb-6">
            至少需要 2 个商品才能进行对比
          </Text>
          <View
            className="px-6 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-full"
            onClick={navigateToProductList}
          >
            <Text>继续添加</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className="flex flex-col h-screen bg-gray-50">
      {/* 头部 */}
      <View className="shrink-0 bg-white px-4 py-3 flex items-center border-b border-gray-100">
        <Text className="text-gray-600 text-lg" onClick={goBack}>←</Text>
        <Text className="flex-1 text-center text-base font-bold text-gray-800">商品对比</Text>
        <Text className="text-sm text-orange-500" onClick={clearCompare}>清空</Text>
      </View>

      <ScrollView className="flex-1" scrollY>
        {/* 产品卡片区域 */}
        <View className="bg-white overflow-x-auto">
          <View className="flex min-w-full">
            {/* 空角落 */}
            <View className="w-20 shrink-0 p-3 border-b border-r border-gray-100 bg-gray-50" />

            {/* 产品列 */}
            {products.map((product) => (
              <View
                key={product.id}
                className="flex-1 min-w-[140px] p-3 border-b border-r border-gray-100 relative"
              >
                <View
                  className="absolute top-1 right-1 w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center z-10"
                  onClick={() => removeFromCompare(product.id)}
                >
                  <Text className="text-xs text-gray-500">✕</Text>
                </View>
                <View onClick={() => navigateToDetail(product.id)}>
                  <View className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                    <Image
                      src={product.image_urls?.[0] || ''}
                      className="w-full h-full object-cover"
                    />
                  </View>
                  <Text className="text-xs font-medium text-gray-800 leading-tight line-clamp-2">
                    {product.name}
                  </Text>
                  <Text className="text-xs text-orange-600 font-bold mt-1">
                    ¥{product.price_range?.min}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 属性对比表格 */}
        <View className="bg-white mt-2">
          {/* 综合评分行 */}
          <View className="flex border-b border-gray-100">
            <View className="w-20 shrink-0 p-3 bg-gray-50 flex items-center">
              <Text className="text-xs text-gray-500">综合评分</Text>
            </View>
            {products.map((product) => (
              <View
                key={product.id}
                className="flex-1 min-w-[140px] p-3 border-l border-gray-100"
              >
                <View className="flex items-center gap-1">
                  <Text className="text-sm font-bold text-orange-500">
                    {product.ratings?.overall || 0}
                  </Text>
                  <Text className="text-xs text-gray-400">/5</Text>
                </View>
                <View className="flex gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Text
                      key={i}
                      className={`text-[10px] ${
                        i < Math.round(product.ratings?.overall || 0)
                          ? 'text-orange-400'
                          : 'text-gray-200'
                      }`}
                    >
                      ⭐
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* 评价数行 */}
          <View className="flex border-b border-gray-100">
            <View className="w-20 shrink-0 p-3 bg-gray-50 flex items-center">
              <Text className="text-xs text-gray-500">评价数</Text>
            </View>
            {products.map((product) => (
              <View
                key={product.id}
                className="flex-1 min-w-[140px] p-3 border-l border-gray-100"
              >
                <Text className="text-xs text-gray-700">{product.review_count || 0} 条</Text>
              </View>
            ))}
          </View>

          {/* 动态维度行 */}
          {dimensions.map((dimension) => (
            <View key={dimension} className="flex border-b border-gray-100">
              <View className="w-20 shrink-0 p-3 bg-gray-50 flex items-center">
                <Text className="text-xs text-gray-500">{dimension}</Text>
              </View>
              {products.map((product) => (
                <View
                  key={product.id}
                  className="flex-1 min-w-[140px] p-3 border-l border-gray-100"
                >
                  {isRatingDimension(dimension) ? (
                    getAttributeValue(product, dimension)
                  ) : (
                    <Text className="text-xs text-gray-700">{getAttributeValue(product, dimension)}</Text>
                  )}
                </View>
              ))}
            </View>
          ))}

          {/* 优点行 */}
          <View className="flex border-b border-gray-100">
            <View className="w-20 shrink-0 p-3 bg-gray-50">
              <Text className="text-xs text-gray-500">优点</Text>
            </View>
            {products.map((product) => (
              <View
                key={product.id}
                className="flex-1 min-w-[140px] p-3 border-l border-gray-100"
              >
                <View className="flex flex-wrap gap-1">
                  {product.pros?.slice(0, 3).map((pro, i) => (
                    <Text
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full"
                    >
                      {pro}
                    </Text>
                  ))}
                  {(!product.pros || product.pros.length === 0) && (
                    <Text className="text-xs text-gray-400">-</Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* 缺点行 */}
          <View className="flex border-b border-gray-100">
            <View className="w-20 shrink-0 p-3 bg-gray-50">
              <Text className="text-xs text-gray-500">缺点</Text>
            </View>
            {products.map((product) => (
              <View
                key={product.id}
                className="flex-1 min-w-[140px] p-3 border-l border-gray-100"
              >
                <View className="flex flex-wrap gap-1">
                  {product.cons?.slice(0, 3).map((con, i) => (
                    <Text
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded-full"
                    >
                      {con}
                    </Text>
                  ))}
                  {(!product.cons || product.cons.length === 0) && (
                    <Text className="text-xs text-gray-400">-</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 继续添加按钮 */}
        {compareList.length < 4 && (
          <View className="px-4 py-6">
            <View
              className="w-full py-3 border border-dashed border-orange-300 rounded-xl flex items-center justify-center gap-2"
              onClick={navigateToProductList}
            >
              <Text className="text-orange-500 text-sm">+</Text>
              <Text className="text-orange-500 text-sm">添加更多商品对比</Text>
            </View>
          </View>
        )}

        <View className="h-4" />
      </ScrollView>
    </View>
  )
}
