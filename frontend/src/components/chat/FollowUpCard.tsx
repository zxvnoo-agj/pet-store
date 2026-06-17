import React from 'react'
import { View, Text } from '@tarojs/components'
import type { FollowUpAnswerCard } from '../../types/chat'

interface Props {
  card: FollowUpAnswerCard
  onQuestionPress?: (question: string) => void
}

export default function FollowUpCard({ card, onQuestionPress }: Props) {
  return (
    <View className="mt-3 rounded-lg border border-orange-100 bg-white p-3">
      <Text className="text-sm font-semibold text-gray-900">{card.title}</Text>
      <Text className="text-[11px] text-gray-500 mt-1 leading-relaxed">{card.payload.reason}</Text>
      <View className="mt-2 flex flex-col gap-2">
        {card.payload.questions.map((question) => (
          <View
            key={question}
            className="rounded-md border border-orange-100 bg-orange-50 px-2.5 py-2 mini-press"
            onClick={() => onQuestionPress?.(question)}
          >
            <Text className="text-xs text-orange-700">{question}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
