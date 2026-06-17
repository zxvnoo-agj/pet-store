import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, Textarea, Switch } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../stores/authStore'
import {
  clearAssistantMemory,
  getAssistantMemory,
  updateAssistantMemory,
  updateAssistantMemorySettings,
} from '../../services/assistantMemoryApi'
import type { AssistantMemory, AssistantMemorySections } from '../../types/chat'

const SECTION_META: Array<{
  key: keyof AssistantMemorySections
  title: string
  placeholder: string
}> = [
  { key: 'pet_status', title: '宠物状况', placeholder: '例如：6个月布偶猫，换粮易软便。' },
  { key: 'preferences_budget', title: '偏好预算', placeholder: '例如：偏好肠胃友好型幼猫粮，预算300元以内。' },
  { key: 'common_questions', title: '常问问题', placeholder: '例如：猫粮选择、换粮节奏、成分解读。' },
  { key: 'cautions', title: '注意事项', placeholder: '例如：鸡肉配方需谨慎，突然换粮会软便。' },
]

const EMPTY_SECTIONS: AssistantMemorySections = {
  pet_status: '',
  preferences_budget: '',
  common_questions: '',
  cautions: '',
}

export default function AiMemoryPage() {
  const { isLoggedIn } = useAuthStore()
  const [memory, setMemory] = useState<AssistantMemory | null>(null)
  const [sections, setSections] = useState<AssistantMemorySections>(EMPTY_SECTIONS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const summary = useMemo(() => {
    const labels: Record<keyof AssistantMemorySections, string> = {
      pet_status: '宠物状况',
      preferences_budget: '偏好预算',
      common_questions: '常问问题',
      cautions: '注意事项',
    }
    return SECTION_META
      .map(({ key }) => {
        const value = sections[key].trim()
        return value ? `${labels[key]}：${value}` : ''
      })
      .filter(Boolean)
      .join('')
  }, [sections])

  const characterCount = summary.length
  const isTooLong = characterCount > 500

  useEffect(() => {
    if (isLoggedIn) {
      fetchMemory()
    } else {
      setLoading(false)
    }
  }, [isLoggedIn])

  const fetchMemory = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAssistantMemory()
      setMemory(data)
      setSections(data.sections || EMPTY_SECTIONS)
    } catch {
      setError('加载失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  const handleSectionChange = (key: keyof AssistantMemorySections, value: string) => {
    setSections((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (isTooLong || saving) return
    setSaving(true)
    try {
      const data = await updateAssistantMemory(sections)
      setMemory(data)
      setSections(data.sections)
      Taro.showToast({ title: '已保存', icon: 'success' })
    } catch {
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (enabled: boolean) => {
    try {
      await updateAssistantMemorySettings(enabled)
      setMemory((prev) => prev ? { ...prev, enabled } : prev)
      Taro.showToast({ title: enabled ? '已开启' : '已暂停', icon: 'success' })
    } catch {
      Taro.showToast({ title: '设置失败', icon: 'none' })
    }
  }

  const handleClear = async () => {
    const res = await Taro.showModal({
      title: '清空 AI 印象',
      content: '会清空当前四类长期记忆，但不会删除聊天记录。',
      confirmText: '清空',
      confirmColor: '#ef4444',
    })
    if (!res.confirm) return
    try {
      const data = await clearAssistantMemory()
      setMemory(data)
      setSections(data.sections)
      Taro.showToast({ title: '已清空', icon: 'success' })
    } catch {
      Taro.showToast({ title: '清空失败', icon: 'none' })
    }
  }

  if (!isLoggedIn) {
    return (
      <View className="flex flex-col items-center justify-center h-screen bg-gray-50 text-gray-400">
        <Text className="text-sm">请先登录</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-[#fff8f2] px-4 py-4">
      {loading ? (
        <View className="py-20 text-center">
          <Text className="text-sm text-gray-400">加载中...</Text>
        </View>
      ) : error ? (
        <View className="py-20 text-center">
          <Text className="text-sm text-gray-400">{error}</Text>
          <View className="mt-4 inline-flex px-5 py-2 bg-orange-500 rounded-full mini-press" onClick={fetchMemory}>
            <Text className="text-sm text-white">重试</Text>
          </View>
        </View>
      ) : (
        <>
          <View className="bg-white rounded-3xl p-4 border border-orange-100 mini-card">
            <View className="flex flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">AI 助手长期记忆</Text>
                <Text className="text-xs text-gray-500 mt-1 leading-relaxed">
                  仅保留宠物用品和宠物知识建议所需的信息。
                </Text>
              </View>
              <Switch
                checked={memory?.enabled ?? true}
                color="#f97316"
                onChange={(event) => handleToggle(event.detail.value)}
              />
            </View>
            <Text className="text-[11px] text-gray-400 mt-3">
              {memory?.enabled ? 'Dream 会定期整理新增对话。' : '已暂停记录，聊天不会使用这段记忆。'}
            </Text>
          </View>

          <View className="mt-3 bg-white rounded-3xl p-4 border border-orange-100 mini-card">
            <View className="flex flex-row justify-between items-center">
              <Text className="text-sm font-semibold text-gray-900">当前印象</Text>
              <Text className={`text-xs ${isTooLong ? 'text-red-500' : 'text-gray-400'}`}>
                {characterCount}/500
              </Text>
            </View>
            <Text className="text-xs text-gray-600 mt-2 leading-relaxed">
              {summary || '还没有形成长期记忆。可以手动补充，也可以在后续对话后由 Dream 整理。'}
            </Text>
          </View>

          <View className="mt-3 flex flex-col gap-3">
            {SECTION_META.map((item) => (
              <View key={item.key} className="bg-white rounded-2xl p-3 border border-orange-100 mini-card">
                <Text className="text-sm font-medium text-gray-900">{item.title}</Text>
                <Textarea
                  className="mt-2 w-full min-h-[86px] text-xs text-gray-700 leading-relaxed bg-orange-50/50 rounded-xl p-3 box-border"
                  value={sections[item.key]}
                  maxlength={180}
                  placeholder={item.placeholder}
                  placeholderClass="text-gray-300"
                  onInput={(event) => handleSectionChange(item.key, event.detail.value)}
                />
              </View>
            ))}
          </View>

          <View className="h-20" />
          <View className="fixed left-0 right-0 bottom-0 bg-white border-t border-orange-100 px-4 py-3 flex flex-row gap-3">
            <View
              className="flex-1 py-3 rounded-full border border-gray-200 text-center mini-press"
              onClick={handleClear}
            >
              <Text className="text-sm text-gray-600">清空</Text>
            </View>
            <View
              className={`flex-[2] py-3 rounded-full text-center mini-press ${
                isTooLong || saving ? 'bg-gray-300' : 'bg-orange-500 shadow-lg shadow-orange-200'
              }`}
              onClick={handleSave}
            >
              <Text className="text-sm text-white">{saving ? '保存中...' : '保存修改'}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  )
}
