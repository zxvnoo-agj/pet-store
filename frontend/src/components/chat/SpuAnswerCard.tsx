import React from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { SpuAnswerCard as SpuAnswerCardType } from '../../types/chat'

interface Props {
  card: SpuAnswerCardType
}

export default function SpuAnswerCard({ card }: Props) {
  const { payload } = card

  return (
    <View
      className="mt-3 rounded-lg border border-orange-100 bg-orange-50/40 overflow-hidden mini-press"
      onClick={() => Taro.navigateTo({ url: payload.detail_url })}
    >
      <View className="flex flex-row gap-3 p-3">
        <View className="w-16 h-16 rounded-md overflow-hidden bg-white shrink-0 border border-orange-100">
          {payload.image_url ? (
            <Image src={payload.image_url} className="w-full h-full object-cover" lazyLoad />
          ) : (
            <View className="w-full h-full flex items-center justify-center">
              <Text className="text-[10px] text-orange-300">商品</Text>
            </View>
          )}
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-semibold text-gray-900 truncate">{payload.name}</Text>
          <Text className="text-[11px] text-gray-500 mt-0.5">{payload.brand}</Text>
          <View className="flex flex-row flex-wrap gap-1.5 mt-1.5">
            {payload.category ? <Text className="text-[10px] px-1.5 py-0.5 rounded bg-white text-orange-600">{payload.category}</Text> : null}
            {payload.price_range ? <Text className="text-[10px] px-1.5 py-0.5 rounded bg-white text-orange-600">{payload.price_range}</Text> : null}
          </View>
        </View>
      </View>

      {(payload.pros.length > 0 || payload.cautions.length > 0) && (
        <View className="px-3 pb-3 flex flex-col gap-1.5">
          {payload.pros.slice(0, 2).map((item) => (
            <Text key={item} className="text-[11px] text-green-700">优点：{item}</Text>
          ))}
          {payload.cautions.slice(0, 2).map((item) => (
            <Text key={item} className="text-[11px] text-amber-700">注意：{item}</Text>
          ))}
        </View>
      )}
    </View>
  )
}
