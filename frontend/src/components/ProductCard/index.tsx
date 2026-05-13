import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCompareStore } from '../../stores/compareStore'

interface Product {
  id: number
  name: string
  brand: string
  image_urls: string[]
  price_min: number
  price_max: number
  ratings: { overall: number }
  reviewCount: number
  pros: string[]
  cons: string[]
}

interface ProductCardProps {
  product: Product
  variant?: 'horizontal' | 'vertical'
  showCompare?: boolean
}

export default function ProductCard({ product, variant = 'horizontal', showCompare = true }: ProductCardProps) {
  const { addToCompare, isInCompare } = useCompareStore()
  const inCompare = isInCompare(product.id)

  const navigateToDetail = () => {
    Taro.navigateTo({ url: `/pages/product/detail?id=${product.id}` })
  }

  const handleCompare = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    addToCompare(product.id)
  }

  if (variant === 'vertical') {
    return (
      <View
        className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98]"
        onClick={navigateToDetail}
      >
        <View className="aspect-square overflow-hidden bg-gray-100">
          <Image
            src={product.image_urls?.[0] || ''}
            className="w-full h-full object-cover"
            lazyLoad
          />
        </View>
        <View className="p-2.5">
          <Text className="text-sm font-medium text-gray-900 truncate">{product.name}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">{product.brand}</Text>
          <View className="flex items-center gap-1 mt-1.5">
            <Text className="text-xs font-medium text-orange-500">⭐ {product.ratings.overall}</Text>
            <Text className="text-[10px] text-gray-400">({product.reviewCount})</Text>
          </View>
          <View className="flex items-baseline justify-between mt-1.5">
            <Text className="text-orange-600 font-bold text-sm">
            ¥{product.price_min}
            {product.price_max > product.price_min && <Text className="text-xs">起</Text>}
            </Text>
            {showCompare && (
              <View
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  inCompare
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-gray-100 text-gray-500'
                }`}
                onClick={handleCompare}
              >
                <Text>{inCompare ? '已对比' : '对比'}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    )
  }

  return (
    <View
      className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex gap-3 active:bg-gray-50"
      onClick={navigateToDetail}
    >
      <View className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0">
        <Image
          src={product.image_urls?.[0] || ''}
          className="w-full h-full object-cover"
          lazyLoad
        />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-medium text-gray-900 leading-tight">{product.name}</Text>
        <Text className="text-xs text-gray-500 mt-0.5">{product.brand}</Text>
        
        {/* 优缺点标签 */}
        <View className="flex flex-wrap gap-1 mt-1.5">
          {product.pros.slice(0, 2).map((pro, i) => (
            <Text key={`pro-${i}`} className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full">
              +{pro}
            </Text>
          ))}
          {product.cons.slice(0, 1).map((con, i) => (
            <Text key={`con-${i}`} className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded-full">
              -{con}
            </Text>
          ))}
        </View>

        <View className="flex items-center justify-between mt-2">
          <View className="flex items-center gap-1.5">
            <View className="flex items-center gap-0.5">
              <Text className="text-xs font-medium text-orange-500">⭐ {product.ratings.overall}</Text>
            </View>
            <View className="flex items-center gap-0.5 text-gray-400">
              <Text className="text-[10px]">💬 {product.reviewCount}</Text>
            </View>
          </View>
          <View className="flex items-center gap-2">
            <Text className="text-orange-600 font-bold text-sm">
              ¥{product.price_min}
            </Text>
            {showCompare && (
              <View
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  inCompare
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-gray-100 text-gray-500'
                }`}
                onClick={handleCompare}
              >
                <Text>{inCompare ? '已对比' : '对比'}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  )
}
