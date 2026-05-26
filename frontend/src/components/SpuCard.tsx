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

function msgUri(size: number): string {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>`)}`
}

const starFilledUri = (s: number) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${s}" height="${s}" fill="#fb923c" stroke="#fb923c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`)}`

const SpuCard: React.FC<SpuCardProps> = ({ spu, variant = 'horizontal', showCompare = true }) => {
  const { addToCompare, isInCompare } = useCompareStore();
  const inCompare = isInCompare(spu.id);

  const navigateToDetail = () => {
    Taro.navigateTo({ url: `/pages/product/detail?id=${spu.id}` });
  };

  const handleCompare = (e: any) => {
    e.stopPropagation();
    addToCompare(spu.id);
  };

  if (variant === 'vertical') {
    return (
      <View
        className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
        onClick={navigateToDetail}
      >
        <View className="aspect-square overflow-hidden bg-gray-100">
          <Image
            src={spu.image_urls?.[0] || ''}
            className="w-full h-full"
            mode="aspectFill"
          />
        </View>
        <View className="p-2.5">
          <Text className="text-sm font-medium text-gray-900 truncate block">{spu.name}</Text>
          <Text className="text-xs text-gray-500 mt-0.5 block">{spu.brand}</Text>
          <View className="flex items-center gap-1 mt-1.5">
            <Image src={starFilledUri(12)} style={{ width: 12, height: 12 }} />
            <Text className="text-xs font-medium text-orange-500">{spu.rating || 0}</Text>
            <Text className="text-[10px] text-gray-400">({spu.review_count || 0})</Text>
          </View>
          <View className="flex items-baseline justify-between mt-1.5">
            <Text className="text-orange-600 font-bold text-sm">
              ¥{spu.price_min || 0}
              {(spu.price_max || 0) > (spu.price_min || 0) && <Text className="text-xs">起</Text>}
            </Text>
            {showCompare && (
              <Text
                className={`px-2 py-0.5 rounded-full text-[10px] ${inCompare ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}
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
      className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex gap-3 active:bg-gray-50 transition-colors"
      onClick={navigateToDetail}
    >
      <View className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0">
        <Image
          src={spu.image_urls?.[0] || ''}
          className="w-full h-full"
          mode="aspectFill"
        />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-sm font-medium text-gray-900 leading-tight block">{spu.name}</Text>
        <Text className="text-xs text-gray-500 mt-0.5 block">{spu.brand}</Text>

        <View className="flex flex-wrap gap-1 mt-1.5">
          {spu.pros?.slice(0, 2).map((pro, i) => (
            <Text key={`pro-${i}`} className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full">
              +{pro}
            </Text>
          ))}
          {spu.cons?.slice(0, 1).map((con, i) => (
            <Text key={`con-${i}`} className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded-full">
              -{con}
            </Text>
          ))}
        </View>

        <View className="flex items-center justify-between mt-2">
          <View className="flex items-center gap-1.5">
            <View className="flex items-center gap-0.5">
              <Image src={starFilledUri(12)} style={{ width: 12, height: 12 }} />
              <Text className="text-xs font-medium text-orange-500">{spu.rating || 0}</Text>
            </View>
            <View className="flex items-center gap-0.5 text-gray-400">
              <Image src={msgUri(11)} style={{ width: 11, height: 11 }} />
              <Text className="text-[10px]">{spu.review_count || 0}</Text>
            </View>
          </View>
          <View className="flex items-center gap-2">
            <Text className="text-orange-600 font-bold text-sm">
              ¥{spu.price_min || 0}
            </Text>
            {showCompare && (
              <Text
                className={`px-2 py-0.5 rounded-full text-[10px] ${inCompare ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}
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
