import { useState, useRef } from 'react'
import { View, Text, Input, ScrollView, Image } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { apiClient } from '../../services/api'
import MarkdownRenderer from '../../components/MarkdownRenderer'
import { AiAssistantIcon } from '../../components/Icons'

interface Spu {
  id: number
  name: string
  brand: string
  image_urls: string[]
  price_min: number
  price_max: number
  ratings?: { overall: number }
  pros?: string[]
  cons?: string[]
}

interface ToolCall {
  tool: string
  status: 'started' | 'completed'
}

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  isComplete?: boolean
  referencedSpus?: Spu[]
  toolCalls?: ToolCall[]
}

const quickQuestions = [
  '3个月幼猫推荐什么猫粮？',
  '皇家和渴望哪个好？',
  '200元预算推荐',
  '猫咪软便怎么办？',
]

const TOOL_NAMES: Record<string, string> = {
  search_spus: '搜索产品',
  get_spu_detail: '查看产品详情',
  get_reviews_summary: '分析用户评价',
  compare_spus: '对比产品',
}

export default function ChatPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content: '你好！我是宠物用品顾问\n可以帮你推荐用品、对比产品、分析评价。有什么可以帮你的？',
      isComplete: true,
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentStream, setCurrentStream] = useState('')
  const [streamProducts, setStreamProducts] = useState<Spu[]>([])
  const [activeTools, setActiveTools] = useState<ToolCall[]>([])
  const scrollViewRef = useRef(null)
  const initializedRef = useRef(false)

  useDidShow(() => {
    const pendingSessionId = Taro.getStorageSync('pendingSessionId')
    if (pendingSessionId) {
      Taro.removeStorageSync('pendingSessionId')
      setMessages([])
      setSessionId(pendingSessionId)
      loadSessionMessages(pendingSessionId)
      return
    }

    if (!initializedRef.current) {
      initializedRef.current = true
      const { sessionId: sid } = router.params
      if (sid) {
        const id = parseInt(sid, 10)
        setSessionId(id)
        loadSessionMessages(id)
      }
    }
  })

  const loadSessionMessages = async (sid: number) => {
    try {
      const res = await apiClient.get(`/chat/sessions/${sid}/messages`)
      if (res.messages && res.messages.length > 0) {
        const loadedMessages: Message[] = res.messages.map((msg: any, index: number) => ({
          id: index + 1,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          isComplete: true,
          referencedSpus: undefined,
          toolCalls: msg.tool_calls?.length > 0
            ? msg.tool_calls.map((tc: any) => ({
                tool: tc.tool || tc.name || '',
                status: 'completed' as const,
              }))
            : undefined,
        }))
        setMessages(loadedMessages)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const navigateToProduct = (productId: number) => {
    Taro.navigateTo({ url: `/pages/product/detail?id=${productId}` })
  }

  const navigateToSessions = () => {
    Taro.navigateTo({ url: '/pages/chat/list' })
  }

  const parseSSEChunk = (chunk: string): { type: string; data: any }[] => {
    const events: { type: string; data: any }[] = []
    const lines = chunk.split('\n')
    let currentEvent = ''
    let currentData = ''

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        if (currentEvent || currentData) {
          events.push({ type: currentEvent || 'message', data: currentData })
        }
        currentEvent = line.slice(7).trim()
        currentData = ''
      } else if (line.startsWith('data: ')) {
        currentData = line.slice(6)
      } else if (line === '' && (currentEvent || currentData)) {
        events.push({ type: currentEvent || 'message', data: currentData })
        currentEvent = ''
        currentData = ''
      }
    }

    if (currentEvent || currentData) {
      events.push({ type: currentEvent || 'message', data: currentData })
    }

    return events
  }

  const handleSend = async (text?: string) => {
    const content = text || inputValue.trim()
    if (!content || isLoading) return

    let sid = sessionId
    if (!sid) {
      try {
        const res = await apiClient.post('/chat/sessions', {})
        sid = res.session_id
        setSessionId(sid)
      } catch (error) {
        console.error('Failed to create session:', error)
        Taro.showToast({ title: '会话创建失败，请重试', icon: 'none' })
        return
      }
    }

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
    setStreamProducts([])
    setActiveTools([])

    try {
      const baseURL = process.env.NODE_ENV === 'development' ? 'http://localhost:8001/v1' : 'https://api.your-domain.com/v1'
      const response = await fetch(`${baseURL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sid,
          content,
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let spus: Spu[] = []
      let toolCalls: ToolCall[] = []

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const events = parseSSEChunk(chunk)

          for (const event of events) {
            switch (event.type) {
              case 'message':
                try {
                  const data = JSON.parse(event.data)
                  if (data.content) {
                    accumulated += data.content
                  }
                } catch {
                  accumulated += event.data
                }
                break

              case 'tool_call':
                try {
                  const data = JSON.parse(event.data)
                  toolCalls = [...toolCalls, { tool: data.tool, status: 'started' }]
                  setActiveTools(toolCalls)
                } catch {
                }
                break

              case 'tool_result':
                try {
                  const data = JSON.parse(event.data)
                  toolCalls = toolCalls.map((t) =>
                    t.tool === data.tool ? { ...t, status: 'completed' } : t
                  )
                  setActiveTools(toolCalls)
                } catch {
                }
                break

              case 'spus':
                try {
                  const data = JSON.parse(event.data)
                  spus = data.spus || []
                  setStreamProducts(spus)
                } catch {
                }
                break
            }
          }
        }
      }

      const newMessage: Message = {
        id: Date.now(),
        role: 'assistant',
        content: accumulated,
        isComplete: true,
        referencedSpus: spus.length > 0 ? spus : undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      }

      setMessages((prev) => [...prev, newMessage])
      setCurrentStream('')
      setStreamProducts([])
      setActiveTools([])
    } catch (error) {
      console.error('Chat error:', error)
      Taro.showToast({ title: '发送失败，请重试', icon: 'none' })
    } finally {
      setIsLoading(false)
    }
  }

  const renderProductCards = (spus: Spu[]) => {
    if (!spus || spus.length === 0) return null

    return (
      <View className="mt-3">
        <Text className="text-xs text-gray-500 font-medium mb-2">推荐产品</Text>
        <View className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          {spus.map((spu) => (
            <View
              key={spu.id}
              className="shrink-0 w-36 bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm"
              onClick={() => navigateToProduct(spu.id)}
            >
              <View className="aspect-square overflow-hidden bg-gray-50">
                <Image
                  src={spu.image_urls?.[0] || ''}
                  className="w-full h-full object-cover"
                  lazyLoad
                />
              </View>
              <View className="p-2.5">
                <Text className="text-xs font-semibold text-gray-900 truncate">{spu.name}</Text>
                <Text className="text-[11px] text-gray-500 mt-0.5">{spu.brand}</Text>
                <View className="flex items-center justify-between mt-2">
                  <Text className="text-sm font-bold text-orange-600">
                    ¥{spu.price_min}
                    {spu.price_max > spu.price_min && (
                      <Text className="text-xs font-normal">起</Text>
                    )}
                  </Text>
                  {spu.ratings?.overall && (
                    <View className="flex items-center gap-0.5">
                      <Text className="text-xs">⭐</Text>
                      <Text className="text-xs text-orange-600 font-medium">{spu.ratings.overall}</Text>
                    </View>
                  )}
                </View>
                {spu.pros && spu.pros.length > 0 && (
                  <View className="flex flex-wrap gap-1 mt-1.5">
                    {spu.pros.slice(0, 2).map((pro, i) => (
                      <Text
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full"
                      >
                        +{pro}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>
    )
  }

  const renderToolStatus = (tools: ToolCall[], isHistory = false) => {
    if (tools.length === 0) return null

    const activeCount = tools.filter((t) => t.status === 'started').length
    const completedCount = tools.filter((t) => t.status === 'completed').length

    return (
      <View className={`${isHistory ? 'mt-2 pt-2 border-t border-gray-100' : 'mb-2'}`}>
        <View className="flex items-center gap-2 mb-1.5">
          {activeCount > 0 ? (
            <View className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Text className="text-xs">✅</Text>
          )}
          <Text className="text-xs text-blue-700 font-medium">
            {activeCount > 0
              ? `正在${TOOL_NAMES[tools[tools.length - 1]?.tool] || '处理'}...`
              : `已完成 ${completedCount} 个工具调用`}
          </Text>
        </View>
        <View className="flex flex-wrap gap-1.5">
          {tools.map((tool, i) => (
            <View
              key={i}
              className={`px-2 py-1 rounded-full text-[10px] ${
                tool.status === 'completed'
                  ? 'bg-green-50 text-green-600 border border-green-200'
                  : 'bg-blue-50 text-blue-600 border border-blue-200'
              }`}
            >
              <Text>{tool.status === 'completed' ? '✓' : '⏳'} {TOOL_NAMES[tool.tool] || tool.tool}</Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#f9fafb',
      }}
    >
      {/* Header - 固定顶部 */}
      <View style={{ flexShrink: 0 }} className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 z-20">
        <View className="flex items-center gap-2.5">
          <View className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-sm">
            <AiAssistantIcon size={20} color="white" />
          </View>
          <View>
            <Text className="text-sm font-bold text-gray-800">AI宠物顾问</Text>
            <View className="flex items-center gap-1.5">
              <View className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <Text className="text-[10px] text-gray-400">在线</Text>
            </View>
          </View>
        </View>
        <View
          className="px-3 py-1.5 bg-orange-50 rounded-full"
          onClick={navigateToSessions}
        >
          <Text className="text-xs text-orange-600 font-medium">历史记录</Text>
        </View>
      </View>

      {/* 消息区域 - 占据剩余空间，内部可滚动 */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <ScrollView
          ref={scrollViewRef}
          style={{ height: '100%' }}
          className="px-4"
          scrollY
          scrollWithAnimation
          scrollIntoView={messages.length > 0 ? `msg-${messages[messages.length - 1].id}` : undefined}
          showScrollbar={false}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              id={`msg-${msg.id}`}
              className="mb-5"
            >
              <View
                className={`${
                  msg.role === 'user'
                    ? 'bg-orange-500 text-white rounded-2xl rounded-br-md px-4 py-3'
                    : 'bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <Text className="text-sm leading-relaxed text-white">{msg.content}</Text>
                ) : (
                  <View>
                    {msg.toolCalls && msg.toolCalls.length > 0 && renderToolStatus(msg.toolCalls, true)}
                    <MarkdownRenderer content={msg.content} />
                    {msg.referencedSpus && renderProductCards(msg.referencedSpus)}
                  </View>
                )}
              </View>
            </View>
          ))}

          {isLoading && activeTools.length > 0 && (
            <View className="mb-5">
              <View className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                {renderToolStatus(activeTools)}
                {streamProducts.length > 0 && renderProductCards(streamProducts)}
                <View className="flex items-center gap-1 mt-2">
                  <View className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                  <View className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-75" />
                  <View className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-150" />
                </View>
              </View>
            </View>
          )}

          {isLoading && activeTools.length === 0 && (
            <View className="mb-5">
              <View className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <View className="flex items-center gap-2">
                  <View className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  <Text className="text-sm text-gray-500">正在思考...</Text>
                </View>
              </View>
            </View>
          )}

          {/* 底部留白，确保最后一条消息能被滚动到可视区域 */}
          <View className="h-4" />
        </ScrollView>
      </View>

      {/* 底部区域：快捷问题 + 输入栏 - 固定在底部，paddingBottom 给 TabBar 留空 */}
      <View style={{ flexShrink: 0, paddingBottom: '50px' }}>
        {/* 快捷问题 - 在输入框上方且相邻 */}
        {messages.length <= 1 && !isLoading && (
          <View className="px-4 pt-3 pb-2 bg-gray-50 border-t border-gray-100">
            <Text className="text-xs text-gray-400 mb-2 font-medium">你可以这样问</Text>
            <View className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {quickQuestions.map((q, i) => (
                <View
                  key={i}
                  className="shrink-0 px-4 py-2 bg-white border border-orange-200 text-orange-600 text-sm rounded-full shadow-sm active:bg-orange-50"
                  onClick={() => handleSend(q)}
                >
                  <Text>{q}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 输入栏 */}
        <View className="bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3">
          <Input
            className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-sm"
            placeholder="请输入问题，如：幼猫吃什么粮好？"
            value={inputValue}
            onInput={(e) => setInputValue(e.detail.value)}
            onConfirm={() => handleSend()}
          />
          <View
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
              inputValue.trim() && !isLoading
                ? 'bg-orange-500 text-white active:bg-orange-600'
                : 'bg-gray-200 text-gray-400'
            }`}
            onClick={() => handleSend()}
          >
            <Text className="text-lg">➤</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
