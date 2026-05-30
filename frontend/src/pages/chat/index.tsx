import React, { useState, useRef } from 'react'
import { View, Text, Input, ScrollView, Image } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { apiClient } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { getSuggestedQuestions } from '../../services/petApi'
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

const TOOL_NAMES: Record<string, string> = {
  search_spus: '搜索产品',
  get_spu_detail: '查看产品详情',
  get_reviews_summary: '分析用户评价',
  compare_spus: '对比产品',
}

const DEFAULT_QUESTIONS = [
  '3个月幼猫推荐什么猫粮？',
  '皇家和渴望哪个好？',
  '200元预算推荐',
  '猫咪软便怎么办？',
]

function createUTF8Decoder() {
  let buffer: number[] = []
  let expectedContinuation = 0

  function flushBuffer(): string {
    const bytes = buffer
    buffer = []
    const b0 = bytes[0]
    if ((b0 & 0xE0) === 0xC0 && bytes.length === 2) {
      return String.fromCharCode(((b0 & 0x1F) << 6) | (bytes[1] & 0x3F))
    }
    if ((b0 & 0xF0) === 0xE0 && bytes.length === 3) {
      return String.fromCharCode(((b0 & 0x0F) << 12) | ((bytes[1] & 0x3F) << 6) | (bytes[2] & 0x3F))
    }
    if ((b0 & 0xF8) === 0xF0 && bytes.length === 4) {
      const cp = ((b0 & 0x07) << 18) | ((bytes[1] & 0x3F) << 12) | ((bytes[2] & 0x3F) << 6) | (bytes[3] & 0x3F)
      if (cp > 0xFFFF) {
        const s = cp - 0x10000
        return String.fromCharCode(0xD800 | (s >> 10), 0xDC00 | (s & 0x3FF))
      }
      return String.fromCharCode(cp)
    }
    return '?'
  }

  return function decode(chunk: ArrayBuffer): string {
    const bytes = new Uint8Array(chunk)
    let result = ''
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i]
      if (expectedContinuation > 0) {
        buffer.push(b)
        expectedContinuation--
        if (expectedContinuation === 0) result += flushBuffer()
      } else if ((b & 0x80) === 0) {
        result += String.fromCharCode(b)
      } else if ((b & 0xE0) === 0xC0) {
        buffer = [b]; expectedContinuation = 1
      } else if ((b & 0xF0) === 0xE0) {
        buffer = [b]; expectedContinuation = 2
      } else if ((b & 0xF8) === 0xF0) {
        buffer = [b]; expectedContinuation = 3
      } else {
        result += '?'
      }
    }
    return result
  }
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
  const [quickQuestions, setQuickQuestions] = useState<string[]>(DEFAULT_QUESTIONS)
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [systemInfo, setSystemInfo] = useState<{
    screenHeight: number
    windowHeight: number
    safeAreaBottom: number
    statusBarHeight: number
    navBarHeight: number
    menuRight: number
    tabBarHeight: number
  }>({ screenHeight: 0, windowHeight: 0, safeAreaBottom: 0, statusBarHeight: 0, navBarHeight: 44, menuRight: 0, tabBarHeight: 0 })
  const lastFetchRef = useRef(0)
  const scrollViewRef = useRef(null)
  const initializedRef = useRef(false)

  useDidShow(() => {
    const info = Taro.getSystemInfoSync()
    const safeAreaBottom = info.safeArea ? info.screenHeight - info.safeArea.bottom : 0
    const menuButton = Taro.getMenuButtonBoundingClientRect()
    const navBarHeight = (menuButton.top - info.statusBarHeight!) * 2 + menuButton.height
    const menuRight = info.windowWidth - menuButton.left + 8
    const systemNavBarHeight = (info.platform || '').toLowerCase() === 'android' ? 48 : 44
    const tabBarHeight = info.screenHeight - (info.statusBarHeight || 0) - systemNavBarHeight - info.windowHeight
    setSystemInfo({
      screenHeight: info.screenHeight,
      windowHeight: info.windowHeight,
      safeAreaBottom,
      statusBarHeight: info.statusBarHeight || 0,
      navBarHeight,
      menuRight,
      tabBarHeight,
    })

    const now = Date.now()
    if (now - lastFetchRef.current > 60000) {
      fetchQuestions()
    }

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

  const fetchQuestions = async () => {
    lastFetchRef.current = Date.now()
    setQuestionsLoading(true)
    try {
      const res = await getSuggestedQuestions()
      if (res.questions && res.questions.length > 0) {
        setQuickQuestions(res.questions)
      }
    } catch {
      setQuickQuestions(DEFAULT_QUESTIONS)
    } finally {
      setQuestionsLoading(false)
    }
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
      const baseURL = process.env.TARO_ENV === 'weapp' && process.env.NODE_ENV === 'production' ? 'https://api.pawpalai.cn/v1' : 'http://192.168.1.16:8000/v1'
      const token = useAuthStore.getState().token
      let accumulated = ''
      let spus: Spu[] = []
      let toolCalls: ToolCall[] = []

      const utf8Decode = createUTF8Decoder()

      await new Promise<void>((resolve, reject) => {
        const requestTask = Taro.request({
          url: `${baseURL}/chat/stream`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          data: {
            session_id: sid,
            content,
          },
          enableChunked: true,
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve()
            } else {
              reject(new Error(`HTTP ${res.statusCode}`))
            }
          },
          fail: reject,
        })

        requestTask.onChunkReceived?.((res: any) => {
          const chunk = utf8Decode(res.data)
          const events = parseSSEChunk(chunk)

          for (const event of events) {
            switch (event.type) {
              case 'message':
                try {
                  const data = JSON.parse(event.data)
                  if (data.content) {
                    accumulated += data.content
                    setCurrentStream(accumulated)
                  }
                } catch {
                  accumulated += event.data
                  setCurrentStream(accumulated)
                }
                break

              case 'tool_call':
                try {
                  const data = JSON.parse(event.data)
                  toolCalls = [...toolCalls, { tool: data.tool, status: 'started' }]
                  setActiveTools([...toolCalls])
                } catch {
                }
                break

              case 'tool_result':
                try {
                  const data = JSON.parse(event.data)
                  toolCalls = toolCalls.map((t) =>
                    t.tool === data.tool ? { ...t, status: 'completed' } : t
                  )
                  setActiveTools([...toolCalls])
                } catch {
                }
                break

              case 'spus':
                try {
                  const data = JSON.parse(event.data)
                  spus = data.spus || []
                  setStreamProducts([...spus])
                } catch {
                }
                break
            }
          }
        })
      })

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

    const seen: Record<string, number> = {}
    const labels = tools.map((t) => {
      const name = TOOL_NAMES[t.tool] || t.tool
      seen[name] = (seen[name] || 0) + 1
      const count = seen[t.tool] > 1 && seen[name] > 1 ? seen[name] : undefined
      return count ? `${name}${count}` : name
    })

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
              <Text>{tool.status === 'completed' ? '✓' : '⏳'} {labels[i]}</Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View
      style={{
        height: systemInfo.windowHeight ? `${systemInfo.windowHeight + systemInfo.statusBarHeight}px` : '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#f9fafb',
      }}
    >
      {/* 自定义导航栏 - 与原生导航栏视觉一致 */}
      <View
        style={{ flexShrink: 0, paddingTop: systemInfo.statusBarHeight ? `${systemInfo.statusBarHeight}px` : 0 }}
        className="bg-white z-20"
      >
        <View
          style={{ height: systemInfo.navBarHeight ? `${systemInfo.navBarHeight}px` : '44px', paddingRight: systemInfo.menuRight ? `${systemInfo.menuRight}px` : '0px' }}
          className="flex items-center justify-between px-4 border-b border-gray-100"
        >
          <View className="flex items-center gap-2">
            <View className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-sm">
              <AiAssistantIcon size={16} color="white" />
            </View>
            <View>
              <Text className="text-[15px] font-semibold text-gray-800">AI宠物顾问</Text>
              <View className="flex items-center gap-1">
                <View className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <Text className="text-[10px] text-gray-400">在线</Text>
              </View>
            </View>
          </View>
          <View
            className="px-2.5 py-1 bg-orange-50 rounded-full"
            onClick={navigateToSessions}
          >
            <Text className="text-xs text-orange-600 font-medium">历史</Text>
          </View>
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
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-5`}
            >
              <View
                className={`max-w-[75%] ${
                  msg.role === 'user'
                    ? 'bg-orange-500 text-white rounded-2xl rounded-br-md px-4 py-3'
                    : 'bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <Text className="text-sm leading-relaxed text-white">{msg.content}</Text>
                ) : (
                  <View>
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <>
                        {renderToolStatus(msg.toolCalls, true)}
                        {msg.content && <View className="my-2 border-t border-gray-200" />}
                      </>
                    )}
                    <MarkdownRenderer content={msg.content} />
                    {msg.referencedSpus && renderProductCards(msg.referencedSpus)}
                  </View>
                )}
              </View>
            </View>
          ))}

          {isLoading && activeTools.length > 0 && (
            <View className="flex justify-start mb-5">
              <View className="max-w-[75%] bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
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
            <View className="flex justify-start mb-5">
              <View className="max-w-[75%] bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
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

      {/* 底部区域：快捷问题 + 输入栏 */}
      <View style={{ flexShrink: 0 }}>
        {/* 快捷问题 - 在输入框上方且相邻 */}
        {messages.length <= 1 && !isLoading && (
          <View className="px-4 pt-3 pb-2 bg-gray-50 border-t border-gray-100">
            <Text className="text-xs text-gray-400 mb-2 font-medium">你可以这样问</Text>
            <View className="flex flex-col gap-2 pb-1">
              {questionsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <View
                      key={i}
                      className="px-4 py-2.5 bg-gray-100 rounded-xl animate-pulse"
                    >
                      <Text className="text-sm text-transparent">加载中...</Text>
                    </View>
                  ))
                : quickQuestions.slice(0, 3).map((q, i) => (
                    <View
                      key={i}
                      className="text-orange-600 text-sm active:opacity-70"
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
