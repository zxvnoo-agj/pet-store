import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { apiClient } from '../../services/api'

interface ChatSession {
  id: number
  title: string
  message_count: number
  updated_at: string
}

export default function ChatListPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await apiClient.get('/chat/sessions')
      setSessions(res.sessions || [])
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }

  const navigateToChat = (sessionId: number) => {
    // tab 页无法通过 navigateTo 传参，用 storage 中转
    Taro.setStorageSync('pendingSessionId', sessionId)
    Taro.switchTab({ url: '/pages/chat/index' })
  }

  const createNewSession = async () => {
    try {
      const res = await apiClient.post('/chat/sessions', {})
      Taro.setStorageSync('pendingSessionId', res.session_id)
      Taro.switchTab({ url: '/pages/chat/index' })
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  return (
    <View className="flex flex-col h-screen bg-gray-50">
      <View className="shrink-0 bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <Text className="text-lg font-bold text-gray-800">对话记录</Text>
        <View
          className="px-4 py-2 bg-orange-500 text-white text-sm rounded-full"
          onClick={createNewSession}
        >
          <Text>新建对话</Text>
        </View>
      </View>

      <View className="flex-1 p-4">
        {sessions.map((session) => (
          <View
            key={session.id}
            className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100 active:bg-gray-50"
            onClick={() => navigateToChat(session.id)}
          >
            <View className="flex items-center justify-between">
              <Text className="text-sm font-medium text-gray-800">{session.title}</Text>
              <Text className="text-xs text-gray-400">{session.message_count}条消息</Text>
            </View>
            <Text className="text-xs text-gray-400 mt-1">
              {new Date(session.updated_at).toLocaleDateString()}
            </Text>
          </View>
        ))}

        {sessions.length === 0 && (
          <View className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Text className="text-sm">暂无对话记录</Text>
            <Text className="text-xs mt-2">点击右上角新建对话</Text>
          </View>
        )}
      </View>
    </View>
  )
}
