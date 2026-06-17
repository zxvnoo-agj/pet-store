import React from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ComparisonAnswerCard } from '../../types/chat'

interface Props {
  card: ComparisonAnswerCard
}

export default function ComparisonCard({ card }: Props) {
  return (
    <View className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
      <Text className="text-sm font-semibold text-gray-900">{card.title}</Text>
      <View className="mt-2 flex flex-col gap-2">
        {card.payload.items.map((item, index) => (
          <View
            key={`${item.spu_id || item.name}-${index}`}
            className="bg-white rounded-md px-2.5 py-2 border border-blue-100 mini-press"
            onClick={() => item.spu_id && Taro.navigateTo({ url: `/pages/product/detail?id=${item.spu_id}` })}
          >
            <View className="flex flex-row justify-between gap-2">
              <Text className="text-xs font-medium text-gray-800 flex-1 truncate">{item.name}</Text>
              {item.price_range ? <Text className="text-xs text-blue-600 shrink-0">{item.price_range}</Text> : null}
            </View>
            <Text className="text-[11px] text-gray-500 mt-0.5">{[item.brand, item.category].filter(Boolean).join(' · ')}</Text>
            {item.pros && item.pros.length > 0 ? (
              <Text className="text-[11px] text-green-700 mt-1">优点：{item.pros.slice(0, 2).join('；')}</Text>
            ) : null}
          </View>
        ))}
      </View>
      <Text className="text-[11px] text-blue-700 mt-2 leading-relaxed">{card.payload.recommendation}</Text>
    </View>
  )
}
