import React from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { RecommendationListAnswerCard } from '../../types/chat'

interface Props {
  card: RecommendationListAnswerCard
}

export default function RecommendationListCard({ card }: Props) {
  return (
    <View className="mt-3 rounded-lg border border-green-100 bg-green-50/50 p-3">
      <View className="flex flex-row items-center justify-between gap-2">
        <Text className="text-sm font-semibold text-gray-900">{card.title}</Text>
        {card.payload.filters_applied.length > 0 ? (
          <Text className="text-[10px] text-green-700 shrink-0">{card.payload.filters_applied.slice(0, 2).join(' · ')}</Text>
        ) : null}
      </View>
      <Text className="text-[11px] text-gray-500 mt-1">{card.payload.ranking_reason}</Text>
      <View className="mt-2 flex flex-col gap-2">
        {card.payload.items.map((item, index) => (
          <View
            key={`${item.spu_id || item.name}-${index}`}
            className="bg-white rounded-md px-2.5 py-2 border border-green-100 mini-press"
            onClick={() => item.spu_id && Taro.navigateTo({ url: `/pages/product/detail?id=${item.spu_id}` })}
          >
            <View className="flex flex-row items-start gap-2">
              <Text className="text-[11px] text-green-600 w-4 shrink-0">{index + 1}</Text>
              <View className="flex-1 min-w-0">
                <View className="flex flex-row justify-between gap-2">
                  <Text className="text-xs font-medium text-gray-800 flex-1 truncate">{item.name}</Text>
                  {item.price_range ? <Text className="text-xs text-orange-600 shrink-0">{item.price_range}</Text> : null}
                </View>
                <Text className="text-[11px] text-gray-500 mt-0.5">{[item.brand, item.category].filter(Boolean).join(' · ')}</Text>
                {item.reason ? <Text className="text-[11px] text-green-700 mt-1">{item.reason}</Text> : null}
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
