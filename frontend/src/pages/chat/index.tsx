import { useState, useRef, useEffect } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { apiClient } from '../../services/api'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  isComplete?: boolean
  referencedProducts?: any[]
}

const quickQuestions = [
  '3个月幼猫推荐什么猫粮？',
  '皇家和渴望哪个好？',
  '200元预算推荐',
  '猫咪软便怎么办？',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content: '你好！我是你的宠物用品顾问🐾\n\n我可以帮你：\n• 根据宠物情况推荐合适的用品\n• 对比不同产品的优缺点\n• 分析真实用户评价\n• 解答养宠常见问题\n\n有什么可以帮你的吗？',
      isComplete: true,
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentStream, setCurrentStream] = useState('')
  const scrollViewRef = useRef(null)

  const goBack = () => {
    Taro.navigateBack()
  }

  const navigateToProduct = (productId: number) => {
    Taro.navigateTo({ url: `/pages/product/detail?id=${productId}` })
  }

  const handleSend = async (text?: string) => {
    const content = text || inputValue.trim()
    if (!content || isLoading) return

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content,
      isComplete: true,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setCurrentStream('')

    try {
      // Create session if needed
      let sessionId = 1 // TODO: Get from store
      
      // Call SSE stream endpoint
      const response = await fetch(`${process.env.NODE_ENV === 'development' ? 'http://localhost:8000/v1' : 'https://api.your-domain.com/v1'}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          content,
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data !== '[DONE]') {
                accumulated += data
                setCurrentStream(accumulated)
              }
            }
          }
        }
      }

      const newMessage: Message = {
        id: Date.now(),
        role: 'assistant',
        content: accumulated,
        isComplete: true,
      }

      setMessages((prev) => [...prev, newMessage])
      setCurrentStream('')
    } catch (error) {
      console.error('Chat error:', error)
      Taro.showToast({ title: '发送失败，请重试', icon: 'none' })
    } finally {
      setIsLoading(false)
    }
  }

  const renderMessage = (content: string) => {
    return content.split('\n').map((line, i) => (
      <Text key={i} className="text-xs text-gray-700 leading-relaxed py-0.5">
        {line}
      </Text>
    ))
  }

  return (
    <View className="flex flex-col h-screen bg-gray-50">
      {/* 头部 */}
      <View className="shrink-0 bg-white px-4 py-2.5 flex items-center gap-3 border-b border-gray-100 z-10">
        <Text className="text-gray-600" onClick={goBack}>←</Text>
        <View className="flex items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
            <Text className="text-white">✨</Text>
          </View>
          <View>
            <Text className="text-sm font-bold text-gray-800">AI宠物顾问</Text>
            <View className="flex items-center gap-1">
              <View className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <Text className="text-[10px] text-gray-400">在线</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 消息区域 */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 py-4"
        scrollY
        scrollWithAnimation
        scrollIntoView={messages.length > 0 ? `msg-${messages[messages.length - 1].id}` : ''}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            id={`msg-${msg.id}`}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
          >
            {msg.role === 'assistant' && (
              <View className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 mr-2 self-start mt-0.5">
                <Text className="text-white text-xs">✨</Text>
              </View>
            )}
            <View
              className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-orange-500 text-white rounded-br-md'
                  : 'bg-white border border-gray-100 rounded-bl-md shadow-sm'
              }`}
            >
              {msg.role === 'user' ? (
                <Text className="text-xs leading-relaxed text-white">{msg.content}</Text>
              ) : (
                <View>{renderMessage(msg.content)}</View>
              )}
            </View>
            {msg.role === 'user' && (
              <View className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 ml-2 self-start mt-0.5">
                <Text className="text-gray-500 text-xs">👤</Text>
              </View>
            )}
          </View>
        ))}

        {/* 流式输出 */}
        {currentStream && (
          <View className="flex justify-start mb-4">
            <View className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 mr-2 self-start mt-0.5">
              <Text className="text-white text-xs">✨</Text>
            </View>
            <View className="max-w-[75%] rounded-2xl px-3.5 py-2.5 bg-white border border-gray-100 rounded-bl-md shadow-sm">
              <View>{renderMessage(currentStream)}</View>
              <View className="flex items-center gap-1 mt-1">
                <View className="w-1 h-1 bg-orange-400 rounded-full animate-pulse" />
                <View className="w-1 h-1 bg-orange-400 rounded-full animate-pulse delay-75" />
                <View className="w-1 h-1 bg-orange-400 rounded-full animate-pulse delay-150" />
              </View>
            </View>
          </View>
        )}

        {/* 加载状态 */}
        {isLoading && !currentStream && (
          <View className="flex justify-start mb-4">
            <View className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 mr-2 self-start">
              <Text className="text-white text-xs">✨</Text>
            </View>
            <View className="rounded-2xl px-4 py-3 bg-white border border-gray-100 rounded-bl-md shadow-sm">
              <View className="flex items-center gap-2">
                <Text className="text-xs text-gray-500">⏳ 正在搜索相关产品...</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 快捷问题 */}
      {messages.length <= 1 && (
        <View className="shrink-0 px-4 pb-2">
          <Text className="text-[10px] text-gray-400 mb-2">你可以这样问：</Text>
          <View className="flex gap-2 overflow-x-auto pb-1">
            {quickQuestions.map((q, i) => (
              <View
                key={i}
                className="shrink-0 px-3 py-1.5 bg-white border border-orange-200 text-orange-600 text-xs rounded-full"
                onClick={() => handleSend(q)}
              >
                <Text>{q}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 输入栏 */}
      <View className="shrink-0 bg-white border-t border-gray-100 px-4 py-2.5 flex items-center gap-2 z-10">
        <Input
          className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-xs"
          placeholder="请输入问题，如：幼猫吃什么粮好？"
          value={inputValue}
          onInput={(e) => setInputValue(e.detail.value)}
          onConfirm={() => handleSend()}
        />
        <View
          className={`w-9 h-9 rounded-full flex items-center justify-center ${
            inputValue.trim() && !isLoading
              ? 'bg-orange-500 text-white'
              : 'bg-gray-200 text-gray-400'
          }`}
          onClick={() => handleSend()}
        >
          <Text>➤</Text>
        </View>
      </View>
    </View>
  )
}
