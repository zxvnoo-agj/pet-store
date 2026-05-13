import { useState, useRef, useEffect } from 'react'
import { View, Text, Input, ScrollView, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { apiClient } from '../../services/api'
import MarkdownRenderer from '../../components/MarkdownRenderer'

interface Product {
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
  referencedProducts?: Product[]
  toolCalls?: ToolCall[]
}

const quickQuestions = [
  '3个月幼猫推荐什么猫粮？',
  '皇家和渴望哪个好？',
  '200元预算推荐',
  '猫咪软便怎么办？',
]

const TOOL_NAMES: Record<string, string> = {
  search_products: '搜索产品',
  get_product_detail: '查看产品详情',
  get_reviews_summary: '分析用户评价',
  compare_products: '对比产品',
}

export default function ChatPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content: '你好！我是宠物用品顾问🐾\n可以帮你推荐用品、对比产品、分析评价。有什么可以帮你的？',
      isComplete: true,
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentStream, setCurrentStream] = useState('')
  const [streamProducts, setStreamProducts] = useState<Product[]>([])
  const [activeTools, setActiveTools] = useState<ToolCall[]>([])
  const scrollViewRef = useRef(null)
  const pageHeightRef = useRef(0)
  const initializedRef = useRef(false)

  useEffect(() => {
    const sysInfo = Taro.getSystemInfoSync()
    pageHeightRef.current = sysInfo.windowHeight
  }, [])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const { sessionId: sid } = router.params
    if (sid) {
      const id = parseInt(sid, 10)
      setSessionId(id)
      loadSessionMessages(id)
    } else {
      createNewSession()
    }
  }, [])

  const createNewSession = async () => {
    try {
      const res = await apiClient.post('/chat/sessions', {})
      setSessionId(res.session_id)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  const loadSessionMessages = async (sid: number) => {
    try {
      const res = await apiClient.get(`/chat/sessions/${sid}/messages`)
      if (res.messages && res.messages.length > 0) {
        const loadedMessages: Message[] = res.messages.map((msg: any, index: number) => ({
          id: index + 1,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          isComplete: true,
          referencedProducts: msg.referenced_products,
        }))
        setMessages(loadedMessages)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const goBack = () => {
    Taro.navigateBack()
  }

  const navigateToProduct = (productId: number) => {
    Taro.navigateTo({ url: `/pages/product/detail?id=${productId}` })
  }

  const navigateToSessions = () => {
    Taro.navigateTo({ url: '/pages/chat/list' })
  }

  // Parse SSE events properly
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
    if (!sessionId) {
      Taro.showToast({ title: '会话初始化中，请稍候', icon: 'none' })
      return
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
          session_id: sessionId,
          content,
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let products: Product[] = []
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
                // 执行过程中不展示模型中间输出，只收集最终结论
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
                  // Ignore malformed tool calls
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
                  // Ignore malformed tool results
                }
                break

              case 'products':
                try {
                  const data = JSON.parse(event.data)
                  products = data.products || []
                  setStreamProducts(products)
                } catch {
                  // Ignore malformed products
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
        referencedProducts: products.length > 0 ? products : undefined,
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

  const renderProductCards = (products: Product[]) => {
    if (!products || products.length === 0) return null

    return (
      <View className="mt-3">
        <Text className="text-xs text-gray-500 font-medium mb-2">推荐产品</Text>
        <View className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {products.map((product) => (
            <View
              key={product.id}
              className="shrink-0 w-36 bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm"
              onClick={() => navigateToProduct(product.id)}
            >
              <View className="aspect-square overflow-hidden bg-gray-50">
                <Image
                  src={product.image_urls?.[0] || ''}
                  className="w-full h-full object-cover"
                  lazyLoad
                />
              </View>
              <View className="p-2.5">
                <Text className="text-xs font-semibold text-gray-900 truncate">{product.name}</Text>
                <Text className="text-[11px] text-gray-500 mt-0.5">{product.brand}</Text>
                <View className="flex items-center justify-between mt-2">
                  <Text className="text-sm font-bold text-orange-600">
                    ¥{product.price_min}
                    {product.price_max > product.price_min && (
                      <Text className="text-xs font-normal">起</Text>
                    )}
                  </Text>
                  {product.ratings?.overall && (
                    <View className="flex items-center gap-0.5">
                      <Text className="text-xs">⭐</Text>
                      <Text className="text-xs text-orange-600 font-medium">{product.ratings.overall}</Text>
                    </View>
                  )}
                </View>
                {product.pros && product.pros.length > 0 && (
                  <View className="flex flex-wrap gap-1 mt-1.5">
                    {product.pros.slice(0, 2).map((pro, i) => (
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
    <View className="flex flex-col h-screen bg-gray-50">
      {/* 头部 */}
      <View className="shrink-0 bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 z-10">
        <View className="flex items-center gap-3">
          <Text className="text-gray-600 text-lg" onClick={goBack}>←</Text>
          <View className="flex items-center gap-2.5">
            <View className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-sm">
              <Text className="text-white text-base">🐾</Text>
            </View>
            <View>
              <Text className="text-sm font-bold text-gray-800">AI宠物顾问</Text>
              <View className="flex items-center gap-1.5">
                <View className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <Text className="text-[10px] text-gray-400">在线</Text>
              </View>
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
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-5`}
          >
            {msg.role === 'assistant' && (
              <View className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 mr-2.5 self-start mt-1 shadow-sm">
                <Text className="text-white text-sm">🐾</Text>
              </View>
            )}
            <View
              className={`max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-orange-500 text-white rounded-2xl rounded-br-md px-4 py-3'
                  : 'bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm'
              }`}
            >
              {msg.role === 'user' ? (
                <Text className="text-sm leading-relaxed text-white">{msg.content}</Text>
              ) : (
                <View>
                  {/* 工具调用在最上方 */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && renderToolStatus(msg.toolCalls, true)}
                  {/* Markdown 回答 */}
                  <MarkdownRenderer content={msg.content} />
                  {/* 商品卡片在最下方 */}
                  {msg.referencedProducts && renderProductCards(msg.referencedProducts)}
                </View>
              )}
            </View>
            {msg.role === 'user' && (
              <View className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 ml-2.5 self-start mt-1">
                <Text className="text-gray-500 text-sm">👤</Text>
              </View>
            )}
          </View>
        ))}

        {/* 执行中状态：只展示工具调用，不展示中间文本 */}
        {isLoading && activeTools.length > 0 && (
          <View className="flex justify-start mb-5">
            <View className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 mr-2.5 self-start shadow-sm">
              <Text className="text-white text-sm">🐾</Text>
            </View>
            <View className="max-w-[80%] bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
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

        {/* 初始加载状态（无工具调用时） */}
        {isLoading && activeTools.length === 0 && (
          <View className="flex justify-start mb-5">
            <View className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 mr-2.5 self-start shadow-sm">
              <Text className="text-white text-sm">🐾</Text>
            </View>
            <View className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <View className="flex items-center gap-2">
                <View className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                <Text className="text-sm text-gray-500">正在思考...</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 快捷问题 */}
      {messages.length <= 1 && !isLoading && (
        <View className="shrink-0 px-4 pb-3">
          <Text className="text-xs text-gray-400 mb-2 font-medium">你可以这样问</Text>
          <View className="flex gap-2 overflow-x-auto pb-1">
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

      {/* 输入栏 - 始终显示 */}
      <View className="shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3 z-10">
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
  )
}
