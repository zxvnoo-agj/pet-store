import React from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import ScenarioCard from './ScenarioCard'
import type { ScenarioConfig } from '../config/scenarios'

interface ScenarioSectionProps {
  scenarios: ScenarioConfig[]
  activeScenarioId: string | null
  onScenarioClick: (scenarioId: string) => void
  onClear: () => void
}

const ScenarioSection: React.FC<ScenarioSectionProps> = ({
  scenarios,
  activeScenarioId,
  onScenarioClick,
  onClear,
}) => {
  if (!scenarios || scenarios.length === 0) {
    return null
  }

  return (
    <View className="bg-[#FFF4EA] rounded-2xl mx-5 mt-4 px-4 py-3">
      <View className="flex items-center justify-between mb-2.5">
        <Text className="text-sm font-bold text-gray-800">场景快捷推荐</Text>
        {activeScenarioId && (
          <Text
            className="text-xs text-orange-500 font-medium active:opacity-70"
            onClick={onClear}
          >
            清除
          </Text>
        )}
      </View>
      <ScrollView
        scrollX
        showScrollbar={false}
        className="whitespace-nowrap"
        enhanced
        scrollWithAnimation
      >
        <View className="flex gap-2.5 pb-1">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              isActive={activeScenarioId === scenario.id}
              onClick={() => onScenarioClick(scenario.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

export default ScenarioSection
