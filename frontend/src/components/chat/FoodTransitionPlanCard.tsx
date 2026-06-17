import React from 'react'
import { View, Text } from '@tarojs/components'
import type { FoodTransitionPlanAnswerCard } from '../../types/chat'

interface Props {
  card: FoodTransitionPlanAnswerCard
}

export default function FoodTransitionPlanCard({ card }: Props) {
  const { payload } = card

  return (
    <View className="mt-3 rounded-lg border border-green-100 bg-green-50/50 p-3">
      <Text className="text-sm font-semibold text-gray-900">{card.title}</Text>

      <View className="mt-2 flex flex-col gap-2">
        {payload.phases.map((phase) => (
          <View key={phase.day_range} className="rounded-md border border-green-100 bg-white px-2.5 py-2">
            <View className="flex flex-row items-center justify-between gap-2">
              <Text className="text-xs font-medium text-gray-800">{phase.day_range}</Text>
              <Text className="text-[11px] text-green-700 shrink-0">
                旧{phase.old_food_ratio}% / 新{phase.new_food_ratio}%
              </Text>
            </View>
            <Text className="text-[11px] text-gray-600 mt-1 leading-relaxed">{phase.note}</Text>
          </View>
        ))}
      </View>

      {payload.observe.length > 0 ? (
        <View className="mt-2 flex flex-row flex-wrap gap-1.5">
          {payload.observe.slice(0, 6).map((item) => (
            <Text key={item} className="text-[10px] px-1.5 py-0.5 rounded bg-white text-green-700">
              观察：{item}
            </Text>
          ))}
        </View>
      ) : null}

      {payload.stop_conditions.length > 0 ? (
        <View className="mt-2 flex flex-col gap-1">
          {payload.stop_conditions.slice(0, 3).map((item) => (
            <Text key={item} className="text-[11px] text-amber-700 leading-relaxed">停止：{item}</Text>
          ))}
        </View>
      ) : null}

      <Text className="text-[10px] text-gray-500 mt-2 leading-relaxed">{payload.vet_disclaimer}</Text>
    </View>
  )
}
