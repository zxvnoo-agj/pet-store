import React from 'react'
import { View, Text } from '@tarojs/components'
import type { ScenarioConfig } from '../config/scenarios'

interface ScenarioCardProps {
  scenario: ScenarioConfig
  isActive: boolean
  onClick: () => void
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, isActive, onClick }) => {
  const marker = scenario.title.slice(0, 1)

  return (
    <View
      onClick={onClick}
      className={`shrink-0 w-[170px] h-[82px] rounded-2xl px-3 py-2.5 flex items-center gap-2.5 mini-press ${
        isActive
          ? 'bg-orange-500 shadow-md shadow-orange-200'
          : 'bg-white border border-orange-100 mini-card'
      }`}
    >
      <View className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
        isActive ? 'bg-white/20' : 'bg-orange-50'
      }`}>
        <Text className={`text-base font-bold ${isActive ? 'text-white' : 'text-orange-500'}`}>
          {marker}
        </Text>
      </View>
      <View className="flex-1 min-w-0">
        <Text
          className={`text-sm font-bold truncate block ${
            isActive ? 'text-white' : 'text-gray-800'
          }`}
        >
          {scenario.title}
        </Text>
        <Text
          className={`text-[11px] truncate block mt-0.5 ${
            isActive ? 'text-orange-100' : 'text-gray-400'
          }`}
        >
          {scenario.subtitle}
        </Text>
      </View>
    </View>
  )
}

export default ScenarioCard
