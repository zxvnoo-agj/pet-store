import React from 'react'
import { View, Text } from '@tarojs/components'
import type { IngredientInsightAnswerCard } from '../../types/chat'

interface Props {
  card: IngredientInsightAnswerCard
}

export default function IngredientInsightCard({ card }: Props) {
  const { payload } = card

  return (
    <View className="mt-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
      <Text className="text-sm font-semibold text-gray-900">{payload.subject}</Text>
      <Text className="text-[11px] text-gray-600 mt-1 leading-relaxed">{payload.meaning}</Text>
      {payload.benefits.length > 0 ? (
        <View className="mt-2">
          <Text className="text-[11px] text-green-700 font-medium">可参考</Text>
          {payload.benefits.slice(0, 3).map((item) => (
            <Text key={item} className="block text-[11px] text-gray-700 mt-1">{item}</Text>
          ))}
        </View>
      ) : null}
      {payload.cautions.length > 0 ? (
        <View className="mt-2">
          <Text className="text-[11px] text-amber-700 font-medium">注意</Text>
          {payload.cautions.slice(0, 3).map((item) => (
            <Text key={item} className="block text-[11px] text-gray-700 mt-1">{item}</Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}
