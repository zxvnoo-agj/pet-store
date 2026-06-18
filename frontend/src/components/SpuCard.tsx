import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import type { Spu } from '../types';
import Taro from '@tarojs/taro';
import { useCompareStore } from '../stores/compareStore';

interface SpuCardProps {
  spu: Spu;
  variant?: 'horizontal' | 'vertical';
  showCompare?: boolean;
}

const starFilledUri = (s: number) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${s}" height="${s}" fill="#fb923c" stroke="#fb923c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`)}`

const horizontalImageStyle = {
  width: '112px',
  height: '112px',
  minWidth: '112px',
  flexShrink: 0,
}

const fullImageStyle = {
  width: '100%',
  height: '100%',
  display: 'block',
}

const formatPrice = (price?: number | string | null) => {
  const value = Number(price || 0)
  if (!Number.isFinite(value) || value <= 0) return '暂无价格'
  return `¥${Number.isInteger(value) ? value : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`
}

const formatPriceRange = (min?: number | string | null, max?: number | string | null) => {
  const minValue = Number(min || 0)
  const maxValue = Number(max || 0)
  if (!Number.isFinite(minValue) || minValue <= 0) return '暂无价格'
  if (Number.isFinite(maxValue) && maxValue > minValue) {
    return `${formatPrice(minValue)} - ${formatPrice(maxValue)}`
  }
  return formatPrice(minValue)
}

const SpuCard: React.FC<SpuCardProps> = ({ spu, variant = 'horizontal', showCompare = true }) => {
  const { addToCompare, isInCompare } = useCompareStore();
  const inCompare = isInCompare(spu.id);
  const priceText = formatPriceRange(spu.price_min, spu.price_max);

  const navigateToDetail = () => {
    Taro.navigateTo({ url: `/pages/product/detail?id=${spu.id}` });
  };

  const handleCompare = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    addToCompare(spu.id);
  };

  if (variant === 'vertical') {
    return (
      <View
        className="bg-white rounded-2xl overflow-hidden border border-orange-100/70 mini-card mini-press"
        onClick={navigateToDetail}
      >
        <View className="aspect-square overflow-hidden bg-gray-100">
          <Image
            src={spu.image_urls?.[0] || ''}
            className="w-full h-full"
            mode="aspectFill"
          />
        </View>
        <View className="p-3">
          <Text className="text-base font-semibold text-gray-900 truncate block">{spu.name}</Text>
          <Text className="text-sm text-gray-500 mt-0.5 block">{spu.brand}</Text>
          <View className="flex items-center gap-1 mt-1.5">
            <Image src={starFilledUri(12)} style={{ width: 12, height: 12 }} />
            <Text className="text-xs font-medium text-orange-500">{spu.rating || 0}</Text>
            <Text className="text-xs text-gray-400">({spu.review_count || 0})</Text>
          </View>
          <View className="flex items-baseline justify-between mt-1.5">
            <Text className="text-gray-700 font-semibold text-base">
              {priceText}
            </Text>
            {showCompare && (
              <Text
                className={`px-2.5 py-1 rounded-full text-xs ${inCompare ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}
                onClick={handleCompare}
              >
                {inCompare ? '已对比' : '对比'}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      className="bg-white rounded-3xl p-3.5 border border-orange-100/80 flex gap-3 mini-card mini-press"
      onClick={navigateToDetail}
    >
      <View
        className="rounded-2xl overflow-hidden bg-orange-50 relative"
        style={horizontalImageStyle}
      >
        {spu.image_urls?.[0] ? (
          <Image
            src={spu.image_urls[0]}
            style={fullImageStyle}
            mode="aspectFill"
            lazyLoad
          />
        ) : (
          <View className="flex items-center justify-center" style={fullImageStyle}>
            <Text className="text-xs text-orange-300">暂无图片</Text>
          </View>
        )}
      </View>
        <View className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <View>
          <View className="flex items-center gap-1.5 mb-1">
            <Text className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full font-medium">
              {spu.brand || '精选'}
            </Text>
            {spu.listing_count ? (
              <Text className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                {spu.listing_count} 个参考来源
              </Text>
            ) : null}
          </View>
          <Text className="text-base font-bold text-gray-900 leading-snug block">{spu.name}</Text>

          <View className="flex flex-wrap gap-1 mt-1.5">
            {spu.pros?.slice(0, 2).map((pro, i) => (
              <Text key={`pro-${i}`} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
                适合 {pro}
              </Text>
            ))}
            {spu.cons?.slice(0, 1).map((con, i) => (
              <Text key={`con-${i}`} className="text-xs px-2 py-0.5 bg-red-50 text-red-500 rounded-full">
                注意 {con}
              </Text>
            ))}
          </View>
        </View>

        <View className="flex items-end justify-between mt-2">
          <View className="flex items-center gap-1">
            <Image src={starFilledUri(12)} style={{ width: 12, height: 12 }} />
            <Text className="text-xs text-gray-600 font-medium">{spu.rating || 0}</Text>
            <Text className="text-xs text-gray-400">({spu.review_count || 0})</Text>
          </View>
          <View className="flex items-center gap-2">
            <Text className="text-gray-700 font-semibold text-base">
              {priceText}
            </Text>
            {showCompare && (
              <Text
                className={`px-2.5 py-1 rounded-full text-xs ${inCompare ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}
                onClick={handleCompare}
              >
                {inCompare ? '已对比' : '对比'}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

export default SpuCard;
