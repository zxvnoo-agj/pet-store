export type AnswerCardType =
  | 'spu'
  | 'comparison'
  | 'recommendation_list'
  | 'ingredient_insight'
  | 'follow_up'
  | 'food_transition_plan'

export interface AssistantMemorySections {
  pet_status: string
  preferences_budget: string
  common_questions: string
  cautions: string
}

export interface AssistantMemory {
  enabled: boolean
  summary: string
  sections: AssistantMemorySections
  character_count: number
  last_updated_at?: string | null
  last_extracted_at?: string | null
  last_user_edited_at?: string | null
}

export interface CardItem {
  spu_id?: number | null
  brand?: string | null
  name: string
  pet_type?: string | null
  category?: string | null
  price_range?: string | null
  image_url?: string | null
  reason?: string | null
  pros?: string[]
  cautions?: string[]
}

export interface SpuAnswerCard {
  card_id: string
  card_type: 'spu'
  title: string
  source?: string | null
  payload: {
    spu_id: number
    brand: string
    name: string
    pet_type?: string | null
    category?: string | null
    price_range?: string | null
    pros: string[]
    cautions: string[]
    image_url?: string | null
    detail_url: string
  }
}

export interface ComparisonAnswerCard {
  card_id: string
  card_type: 'comparison'
  title: string
  source?: string | null
  payload: {
    items: CardItem[]
    dimensions: string[]
    recommendation: string
  }
}

export interface RecommendationListAnswerCard {
  card_id: string
  card_type: 'recommendation_list'
  title: string
  source?: string | null
  payload: {
    items: CardItem[]
    ranking_reason: string
    filters_applied: string[]
  }
}

export interface IngredientInsightAnswerCard {
  card_id: string
  card_type: 'ingredient_insight'
  title: string
  source?: string | null
  payload: {
    subject: string
    meaning: string
    benefits: string[]
    cautions: string[]
    suitable_for: string[]
  }
}

export interface FollowUpAnswerCard {
  card_id: string
  card_type: 'follow_up'
  title: string
  source?: string | null
  payload: {
    questions: string[]
    reason: string
  }
}

export interface FoodTransitionPlanAnswerCard {
  card_id: string
  card_type: 'food_transition_plan'
  title: string
  source?: string | null
  payload: {
    phases: Array<{
      day_range: string
      old_food_ratio: number
      new_food_ratio: number
      note: string
    }>
    observe: string[]
    stop_conditions: string[]
    vet_disclaimer: string
  }
}

export type AnswerCard =
  | SpuAnswerCard
  | ComparisonAnswerCard
  | RecommendationListAnswerCard
  | IngredientInsightAnswerCard
  | FollowUpAnswerCard
  | FoodTransitionPlanAnswerCard
