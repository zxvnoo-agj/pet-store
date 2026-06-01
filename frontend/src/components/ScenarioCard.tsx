import React from 'react'
import { View, Text } from '@tarojs/components'
import type { ScenarioConfig } from '../config/scenarios'

interface ScenarioCardProps {
  scenario: ScenarioConfig
  isActive: boolean
  onClick: () => void
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, isActive, onClick }) => {
  return (
    <View
      onClick={onClick}
      className={`shrink-0 w-[160px] h-[80px] rounded-2xl px-3 py-2.5 flex items-center gap-2.5 active:scale-[0.97] transition-all ${
        isActive
          ? 'bg-orange-500 shadow-md shadow-orange-200'
          : 'bg-white shadow-sm'
      }`}
    >
      <Text className="text-2xl">{scenario.icon}</Text>
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
