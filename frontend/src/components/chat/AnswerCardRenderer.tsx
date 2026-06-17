import React from 'react'
import { View } from '@tarojs/components'
import type { AnswerCard } from '../../types/chat'
import ComparisonCard from './ComparisonCard'
import FollowUpCard from './FollowUpCard'
import IngredientInsightCard from './IngredientInsightCard'
import RecommendationListCard from './RecommendationListCard'
import SpuAnswerCard from './SpuAnswerCard'

interface Props {
  cards?: AnswerCard[]
  onQuestionPress?: (question: string) => void
}

export default function AnswerCardRenderer({ cards, onQuestionPress }: Props) {
  if (!cards || cards.length === 0) return null

  return (
    <View>
      {cards.map((card) => {
        switch (card.card_type) {
          case 'spu':
            return <SpuAnswerCard key={card.card_id} card={card} />
          case 'comparison':
            return <ComparisonCard key={card.card_id} card={card} />
          case 'recommendation_list':
            return <RecommendationListCard key={card.card_id} card={card} />
          case 'ingredient_insight':
            return <IngredientInsightCard key={card.card_id} card={card} />
          case 'follow_up':
            return <FollowUpCard key={card.card_id} card={card} onQuestionPress={onQuestionPress} />
          default:
            return null
        }
      })}
    </View>
  )
}
