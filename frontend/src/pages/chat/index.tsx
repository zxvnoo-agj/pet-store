import React, { useState, useRef } from 'react'
import { View, Text, Input, ScrollView, Image } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { apiClient } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { getSuggestedQuestions } from '../../services/petApi'
import MarkdownRenderer from '../../components/MarkdownRenderer'
import { AiAssistantIcon, SendIcon, SparkleIcon } from '../../components/Icons'
import { API_BASE_URL } from '../../config/env'

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

interface ReasoningStep {
  id: number
  content: string
  tools: ToolCall[]
}

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  isComplete?: boolean
  referencedSpus?: Spu[]
  toolCalls?: ToolCall[]
  reasoningSteps?: ReasoningStep[]
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
  const [, setActiveTools] = useState<ToolCall[]>([])
  const [streamSteps, setStreamSteps] = useState<ReasoningStep[]>([])
  const [expandedProcessIds, setExpandedProcessIds] = useState<Record<number, boolean>>({})
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

  async function fetchQuestions() {
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
    setStreamSteps([])

    let pendingText = ''
    let spus: Spu[] = []
    let toolCalls: ToolCall[] = []
    let reasoningSteps: ReasoningStep[] = []
    let currentStepId: number | null = null
    let stepSeq = 0

    const publishSteps = () => {
      setStreamSteps(reasoningSteps.map((step) => ({
        ...step,
        tools: [...step.tools],
      })))
    }

    const ensureStep = (initialContent = '') => {
      if (currentStepId === null) {
        stepSeq += 1
        currentStepId = stepSeq
        reasoningSteps = [
          ...reasoningSteps,
          { id: currentStepId, content: initialContent.trim(), tools: [] },
        ]
        return
      }

      reasoningSteps = reasoningSteps.map((step) =>
        step.id === currentStepId && initialContent.trim() && !step.content
          ? { ...step, content: initialContent.trim() }
          : step
      )
    }

    const addToolToCurrentStep = (tool: ToolCall) => {
      ensureStep(pendingText)
      pendingText = ''
      setCurrentStream('')
      reasoningSteps = reasoningSteps.map((step) =>
        step.id === currentStepId
          ? { ...step, tools: [...step.tools, tool] }
          : step
      )
      publishSteps()
    }

    const completeToolInSteps = (toolName: string) => {
      let updated = false
      reasoningSteps = reasoningSteps.map((step) => ({
        ...step,
        tools: step.tools.map((tool) => {
          if (!updated && tool.tool === toolName && tool.status === 'started') {
            updated = true
            return { ...tool, status: 'completed' as const }
          }
          return tool
        }),
      }))
      publishSteps()
    }

    const startNextStep = () => {
      currentStepId = null
    }

    try {
      const baseURL = API_BASE_URL
      const token = useAuthStore.getState().token

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
                    pendingText += data.content
                    setCurrentStream(pendingText)
                  }
                } catch {
                  pendingText += event.data
                  setCurrentStream(pendingText)
                }
                break

              case 'tool_call':
                try {
                  const data = JSON.parse(event.data)
                  const newTool = { tool: data.tool, status: 'started' as const }
                  toolCalls = [...toolCalls, newTool]
                  setActiveTools([...toolCalls])
                  addToolToCurrentStep(newTool)
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
                  completeToolInSteps(data.tool)
                  startNextStep()
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

              case 'error':
                try {
                  const data = JSON.parse(event.data)
                  console.error('Chat stream error:', data.message)
                } catch {
                  console.error('Chat stream error:', event.data)
                }
                break
            }
          }
        })
      })

      const newMessage: Message = {
        id: Date.now(),
        role: 'assistant',
        content: pendingText,
        isComplete: true,
        referencedSpus: spus.length > 0 ? spus : undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        reasoningSteps: reasoningSteps.length > 0 ? reasoningSteps : undefined,
      }

      setMessages((prev) => [...prev, newMessage])
      setCurrentStream('')
      setStreamProducts([])
      setActiveTools([])
      setStreamSteps([])
    } catch (error) {
      console.error('Chat error:', error)
      if (pendingText || reasoningSteps.length > 0) {
        setMessages((prev) => [...prev, {
          id: Date.now(),
          role: 'assistant',
          content: pendingText || '抱歉，刚才处理对话时出现异常，请稍后再试。',
          isComplete: true,
          referencedSpus: spus.length > 0 ? spus : undefined,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          reasoningSteps: reasoningSteps.length > 0 ? reasoningSteps : undefined,
        }])
        setCurrentStream('')
        setStreamProducts([])
        setActiveTools([])
        setStreamSteps([])
      } else {
        Taro.showToast({ title: '发送失败，请重试', icon: 'none' })
      }
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
      const count = seen[name] > 1 ? seen[name] : undefined
      return count ? `${name}${count}` : name
    })

    return (
      <View className={`${isHistory ? 'mb-3' : 'mb-3'} rounded-xl bg-blue-50 border border-blue-100 px-3 py-2`}>
        <View className="flex items-center justify-between gap-2 mb-1.5">
          <View className="flex items-center gap-2 min-w-0">
            {activeCount > 0 ? (
              <View className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <Text className="text-xs text-green-600 shrink-0">✓</Text>
            )}
            <Text className="text-xs text-blue-700 font-medium truncate">
              {activeCount > 0
                ? `正在${TOOL_NAMES[tools[tools.length - 1]?.tool] || '处理'}...`
                : `已完成 ${completedCount} 个工具调用`}
            </Text>
          </View>
          {tools.length > 1 && (
            <Text className="text-[10px] text-blue-400 shrink-0">{tools.length} 步</Text>
          )}
        </View>
        <View className="flex flex-row flex-wrap gap-1.5">
          {tools.map((tool, i) => (
            <View
              key={i}
              className={`px-2 py-0.5 rounded-full max-w-full ${
                tool.status === 'completed'
                  ? 'bg-white text-green-600 border border-green-100'
                  : 'bg-white text-blue-600 border border-blue-100'
              }`}
            >
              <Text className="text-[10px]">{tool.status === 'completed' ? '✓' : '…'} {labels[i]}</Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  const renderToolPills = (tools: ToolCall[]) => {
    if (tools.length === 0) return null

    return (
      <View className="flex flex-row flex-wrap gap-1.5 mt-2">
        {tools.map((tool, i) => (
          <View
            key={`${tool.tool}-${i}`}
            className={`px-2 py-0.5 rounded-full border ${
              tool.status === 'completed'
                ? 'bg-green-50 text-green-600 border-green-100'
                : 'bg-blue-50 text-blue-600 border-blue-100'
            }`}
          >
            <Text className="text-[10px]">
              {tool.status === 'completed' ? '✓' : '…'} {TOOL_NAMES[tool.tool] || tool.tool}
            </Text>
          </View>
        ))}
      </View>
    )
  }

  const renderProcessTimeline = (
    steps: ReasoningStep[],
    collapsed: boolean,
    onToggle?: () => void,
    liveContent = '',
  ) => {
    const allTools = steps.reduce<ToolCall[]>((tools, step) => [...tools, ...step.tools], [])
    const completedCount = allTools.filter((tool) => tool.status === 'completed').length
    const totalCount = allTools.length
    const stepCount = steps.length + (liveContent.trim() ? 1 : 0)

    if (steps.length === 0 && !liveContent.trim()) return null

    if (collapsed) {
      return (
        <View
          className="mt-3 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 flex flex-row items-center justify-between"
          onClick={onToggle}
        >
          <View className="flex flex-row items-center gap-2 min-w-0">
            <Text className="text-xs text-gray-500">▸</Text>
            <Text className="text-xs text-gray-600 font-medium truncate">
              思考与工具过程
            </Text>
          </View>
          <Text className="text-[10px] text-gray-400 shrink-0">
            {stepCount} 步 · {completedCount}/{totalCount} 工具
          </Text>
        </View>
      )
    }

    return (
      <View className="mt-3 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
        <View
          className="flex flex-row items-center justify-between mb-2"
          onClick={onToggle}
        >
          <Text className="text-xs text-gray-600 font-medium">
            {onToggle ? '▾ ' : ''}思考与工具过程
          </Text>
          <Text className="text-[10px] text-gray-400">
            {stepCount} 步
          </Text>
        </View>

        {steps.map((step, index) => (
          <View key={step.id} className="pb-3 mb-3 border-b border-gray-100">
            <View className="flex flex-row items-center gap-2 mb-1.5">
              <View className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                <Text className="text-[10px] text-gray-500">{index + 1}</Text>
              </View>
              <Text className="text-xs text-gray-500">思考</Text>
            </View>
            {step.content ? (
              <View className="pl-7">
                <MarkdownRenderer content={step.content} />
              </View>
            ) : null}
            {step.tools.length > 0 && (
              <View className="pl-7">
                <Text className="text-[10px] text-gray-400">工具调用</Text>
                {renderToolPills(step.tools)}
              </View>
            )}
          </View>
        ))}

        {liveContent.trim() ? (
          <View>
            <View className="flex flex-row items-center gap-2 mb-1.5">
              <View className="w-5 h-5 rounded-full bg-white border border-blue-100 flex items-center justify-center">
                <View className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              </View>
              <Text className="text-xs text-blue-500">正在思考</Text>
            </View>
            <View className="pl-7">
              <MarkdownRenderer content={liveContent} />
            </View>
          </View>
        ) : null}
      </View>
    )
  }

  const topOffset = systemInfo.statusBarHeight + systemInfo.navBarHeight

  return (
    <View
      style={{
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#fff8f2',
      }}
    >
      {/* 自定义导航栏 - 独立 Fixed 在顶部 */}
      <View
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          paddingTop: systemInfo.statusBarHeight ? `${systemInfo.statusBarHeight}px` : 0,
        }}
        className="bg-white/95"
      >
        <View
          style={{ height: systemInfo.navBarHeight ? `${systemInfo.navBarHeight}px` : '44px', paddingRight: systemInfo.menuRight ? `${systemInfo.menuRight}px` : '0px' }}
          className="flex items-center justify-between px-4 border-b border-orange-100"
        >
          <View className="flex items-center gap-2">
            <View className="w-8 h-8 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-sm">
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
            className="px-3 py-1.5 bg-orange-50 rounded-full mini-press"
            onClick={navigateToSessions}
          >
            <Text className="text-xs text-orange-600 font-medium">历史</Text>
          </View>
        </View>
      </View>

      {/* 内容区 */}
      <View
        style={{
          position: 'fixed',
          top: topOffset ? `${topOffset}px` : '88px',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 消息区域 - 占据剩余空间，内部可滚动 */}
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <ScrollView
            ref={scrollViewRef}
            style={{ height: '100%' }}
            className="px-0"
            scrollY
            scrollWithAnimation
            scrollIntoView={messages.length > 0 ? `msg-${messages[messages.length - 1].id}` : undefined}
            showScrollbar={false}
          >
            {messages.map((msg) => (
              <View
                key={msg.id}
                id={`msg-${msg.id}`}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-center'} mb-5`}
              >
                <View
                  style={
                    msg.role === 'user'
                      ? { maxWidth: '78%', marginRight: '16px', marginLeft: '48px', boxSizing: 'border-box' }
                      : { width: 'calc(100% - 32px)', maxWidth: '100%', marginLeft: '16px', marginRight: '16px', boxSizing: 'border-box' }
                  }
                  className={`min-w-0 ${
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-md shadow-orange-100'
                      : 'bg-white border border-orange-100 rounded-2xl px-4 py-3 mini-card'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <Text className="text-sm leading-relaxed text-white" style={{ wordBreak: 'break-word' }}>{msg.content}</Text>
                  ) : (
                    <View>
                      {msg.content ? <MarkdownRenderer content={msg.content} /> : null}
                      {msg.referencedSpus && renderProductCards(msg.referencedSpus)}
                      {msg.reasoningSteps && msg.reasoningSteps.length > 0 ? (
                        renderProcessTimeline(
                          msg.reasoningSteps,
                          !expandedProcessIds[msg.id],
                          () => setExpandedProcessIds((prev) => ({
                            ...prev,
                            [msg.id]: !prev[msg.id],
                          })),
                        )
                      ) : msg.toolCalls && msg.toolCalls.length > 0 && (
                        renderToolStatus(msg.toolCalls, true)
                      )}
                    </View>
                  )}
                </View>
              </View>
            ))}

            {isLoading && streamSteps.length > 0 && (
              <View className="flex justify-center mb-5">
                <View
                  className="min-w-0 bg-white border border-orange-100 rounded-2xl px-4 py-3 mini-card"
                  style={{ width: 'calc(100% - 32px)', marginLeft: '16px', marginRight: '16px', boxSizing: 'border-box' }}
                >
                  {renderProcessTimeline(streamSteps, false, undefined, currentStream)}
                  {streamProducts.length > 0 && renderProductCards(streamProducts)}
                  <View className="flex items-center gap-1 mt-2">
                    <View className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                    <View className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-75" />
                    <View className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-150" />
                  </View>
                </View>
              </View>
            )}

            {isLoading && streamSteps.length === 0 && currentStream && (
              <View className="flex justify-center mb-5">
                <View
                  className="min-w-0 bg-white border border-orange-100 rounded-2xl px-4 py-3 mini-card"
                  style={{ width: 'calc(100% - 32px)', marginLeft: '16px', marginRight: '16px', boxSizing: 'border-box' }}
                >
                  <MarkdownRenderer content={currentStream} />
                  <View className="flex items-center gap-1 mt-1">
                    <View className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                    <View className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-75" />
                    <View className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-150" />
                  </View>
                </View>
              </View>
            )}

            {isLoading && streamSteps.length === 0 && !currentStream && (
              <View className="flex justify-center mb-5">
                <View
                  className="min-w-0 bg-white border border-orange-100 rounded-2xl px-4 py-3 mini-card"
                  style={{ width: 'calc(100% - 32px)', marginLeft: '16px', marginRight: '16px', boxSizing: 'border-box' }}
                >
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
            <View className="px-4 pt-3 pb-3 bg-[#fff8f2] border-t border-orange-100 mini-fade-up">
              <View className="flex items-center gap-2 mb-2">
                <SparkleIcon size={15} color="#f97316" />
                <Text className="text-xs text-gray-500 font-medium">你可以这样问</Text>
              </View>
              <View className="flex flex-col gap-2 pb-1">
                {questionsLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <View
                        key={i}
                        className="px-4 py-2.5 bg-white rounded-2xl animate-pulse"
                      >
                        <Text className="text-sm text-transparent">加载中...</Text>
                      </View>
                    ))
                  : quickQuestions.slice(0, 3).map((q, i) => (
                      <View
                        key={i}
                        className="bg-white border border-orange-100 rounded-2xl px-4 py-2.5 flex items-center justify-between mini-card mini-press"
                        onClick={() => handleSend(q)}
                      >
                        <Text className="text-orange-600 text-sm">{q}</Text>
                        <Text className="text-xs text-orange-300 mini-caret">→</Text>
                      </View>
                    ))}
              </View>
            </View>
          )}

          {/* 输入栏 */}
          <View className="bg-white border-t border-orange-100 px-4 py-3 flex items-center gap-3 shadow-[0_-8px_24px_rgba(15,23,42,0.04)]">
            <Input
              className="flex-1 min-w-0 bg-gray-50 rounded-full px-4 py-3 text-sm border border-gray-100"
              placeholder="请输入问题，如：幼猫吃什么粮好？"
              value={inputValue}
              onInput={(e) => setInputValue(e.detail.value)}
              onConfirm={() => handleSend()}
            />
            <View
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm mini-press ${
                inputValue.trim() && !isLoading
                  ? 'bg-orange-500 text-white active:bg-orange-600'
                  : 'bg-gray-200 text-gray-400'
              }`}
              onClick={() => handleSend()}
            >
              <SendIcon size={18} color={inputValue.trim() && !isLoading ? '#ffffff' : '#9ca3af'} />
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
