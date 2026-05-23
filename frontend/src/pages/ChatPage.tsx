import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Send, Sparkles, Loader2, User } from 'lucide-react';

interface Spu {
  id: number
  name: string
  brand: string
  image_urls: string[]
  price_min: number
  price_max: number
}

interface ToolCall {
  tool: string
  status: 'started' | 'completed'
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  isComplete?: boolean;
  referencedSpus?: Spu[];
  toolCalls?: ToolCall[];
}

const QUICK_QUESTIONS = [
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

const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8001/v1'
  : 'https://api.your-domain.com/v1'

function parseSSEChunk(chunk: string): { type: string; data: any }[] {
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

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content: '你好！我是你的宠物用品顾问🐾\n\n我可以帮你：\n• 根据宠物情况推荐合适的用品\n• 对比不同产品的优缺点\n• 分析真实用户评价\n• 解答养宠常见问题\n\n有什么可以帮你的吗？',
      isComplete: true,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState('');
  const [streamSpus, setStreamSpus] = useState<Spu[]>([])
  const [activeTools, setActiveTools] = useState<ToolCall[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStream, activeTools, streamSpus]);

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    createNewSession()
  }, [])

  const createNewSession = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const body = await res.json()
      setSessionId(body.data?.session_id)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  const handleSend = async (text?: string) => {
    const content = text || inputValue.trim();
    if (!content || isLoading) return;
    if (!sessionId) {
      return
    }

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content,
      isComplete: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setCurrentStream('');
    setStreamSpus([]);
    setActiveTools([]);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, content }),
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
                  setActiveTools(toolCalls)
                } catch {}
                break

              case 'tool_result':
                try {
                  const data = JSON.parse(event.data)
                  toolCalls = toolCalls.map((t) =>
                    t.tool === data.tool ? { ...t, status: 'completed' } : t
                  )
                  setActiveTools(toolCalls)
                } catch {}
                break

              case 'spus':
                try {
                  const data = JSON.parse(event.data)
                  spus = data.spus || []
                  setStreamSpus(spus)
                } catch {}
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
      };

      setMessages(prev => [...prev, newMessage]);
      setCurrentStream('');
      setStreamSpus([]);
      setActiveTools([]);
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false);
    }
  };

  const renderInline = (text: string): (string | JSX.Element)[] => {
    const parts = text.split(/(\*\*.*?\*\*)/)
    return parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  const renderMessage = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={i} className="text-sm font-bold text-gray-800 mt-2 mb-1">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      if (line.startsWith('**') && line.includes('**')) {
        return (
          <p key={i} className="text-xs font-semibold text-gray-700 mt-1.5">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <p key={i} className="text-xs text-gray-600 pl-1 py-0.5">
            {renderInline(line)}
          </p>
        );
      }
      if (/^\d️⃣/.test(line) || /^\d\./.test(line)) {
        return (
          <p key={i} className="text-xs text-gray-700 font-medium mt-1.5 pl-1">
            {line}
          </p>
        );
      }
      if (line.startsWith('---')) {
        return <hr key={i} className="my-2 border-gray-200" />;
      }
      if (line.startsWith('|')) {
        const cells = line.split('|').filter(c => c.trim());
        if (cells.length > 1 && !line.includes('---')) {
          return (
            <div key={i} className="flex gap-2 py-0.5 text-xs">
              {cells.map((cell, j) => (
                <span key={j} className={`${j === 0 ? 'font-medium text-gray-600 w-20' : 'text-gray-700'}`}>
                  {renderInline(cell.trim())}
                </span>
              ))}
            </div>
          );
        }
        return null;
      }
      if (!line.trim()) {
        return <div key={i} className="h-1" />;
      }
      return (
        <p key={i} className="text-xs text-gray-700 leading-relaxed py-0.5">
          {renderInline(line)}
        </p>
      );
    });
  };

  const renderToolStatus = (tools: ToolCall[], isHistory = false) => {
    if (tools.length === 0) return null
    const activeCount = tools.filter((t) => t.status === 'started').length
    const completedCount = tools.filter((t) => t.status === 'completed').length

    return (
      <div className={`${isHistory ? 'mt-2 pt-2 border-t border-gray-100' : 'mb-2'}`}>
        <div className="flex items-center gap-2 mb-1.5">
          {activeCount > 0 ? (
            <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-xs">✅</span>
          )}
          <span className="text-xs text-blue-700 font-medium">
            {activeCount > 0
              ? `正在${TOOL_NAMES[tools[tools.length - 1]?.tool] || '处理'}...`
              : `已完成 ${completedCount} 个工具调用`}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tools.map((tool, i) => (
            <span
              key={i}
              className={`px-2 py-1 rounded-full text-[10px] ${
                tool.status === 'completed'
                  ? 'bg-green-50 text-green-600 border border-green-200'
                  : 'bg-blue-50 text-blue-600 border border-blue-200'
              }`}
            >
              {tool.status === 'completed' ? '✓' : '⏳'} {TOOL_NAMES[tool.tool] || tool.tool}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const renderProductCards = (spus: Spu[]) => {
    if (!spus || spus.length === 0) return null
    return (
      <div className="mt-3">
        <p className="text-xs text-gray-500 font-medium mb-2">推荐产品</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {spus.map((spu) => (
            <button
              key={spu.id}
              className="shrink-0 w-36 bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm text-left"
              onClick={() => navigate(`/product/${spu.id}`)}
            >
              <div className="aspect-square overflow-hidden bg-gray-50">
                <img
                  src={spu.image_urls?.[0] || ''}
                  alt={spu.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold text-gray-900 truncate">{spu.name}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{spu.brand}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-orange-600">
                    ¥{spu.price_min}
                    {spu.price_max > spu.price_min && <span className="text-xs font-normal">起</span>}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gray-100 flex justify-center items-start md:py-8">
      <div className="w-full max-w-[430px] h-[100dvh] md:h-[850px] bg-gray-50 md:rounded-[40px] md:shadow-2xl md:border-[8px] md:border-gray-800 overflow-hidden relative flex flex-col">
        <div className="hidden md:block h-6 bg-gray-800 rounded-b-xl mx-auto w-32 z-10 shrink-0" />

        {/* 头部 */}
        <div className="shrink-0 bg-white px-4 py-2.5 flex items-center gap-3 border-b border-gray-100 z-10">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-800">AI宠物顾问</h1>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-[10px] text-gray-400">在线</span>
              </div>
            </div>
          </div>
          <button className="ml-auto p-1.5">
            <MoreHorizontal size={20} className="text-gray-600" />
          </button>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 mr-2 self-start mt-0.5">
                  <Sparkles size={13} className="text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-orange-500 text-white rounded-br-md'
                    : 'bg-white border border-gray-100 rounded-bl-md shadow-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-xs leading-relaxed">{msg.content}</p>
                ) : (
                  <div>
                    {msg.toolCalls && msg.toolCalls.length > 0 && renderToolStatus(msg.toolCalls, true)}
                    <div>{renderMessage(msg.content)}</div>
                    {msg.referencedSpus && renderProductCards(msg.referencedSpus)}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 ml-2 self-start mt-0.5">
                  <User size={13} className="text-gray-500" />
                </div>
              )}
            </div>
          ))}

          {/* 执行中状态 */}
          {isLoading && activeTools.length > 0 && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 mr-2 self-start mt-0.5">
                <Sparkles size={13} className="text-white" />
              </div>
              <div className="max-w-[75%] bg-white border border-gray-100 rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm">
                {renderToolStatus(activeTools)}
                {streamSpus.length > 0 && renderProductCards(streamSpus)}
                <div className="flex items-center gap-1 mt-2">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-75" />
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse delay-150" />
                </div>
              </div>
            </div>
          )}

          {/* 流式输出 */}
          {isLoading && currentStream && activeTools.length === 0 && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 mr-2 self-start mt-0.5">
                <Sparkles size={13} className="text-white" />
              </div>
              <div className="max-w-[75%] rounded-2xl px-3.5 py-2.5 bg-white border border-gray-100 rounded-bl-md shadow-sm">
                <div>{renderMessage(currentStream)}</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-1 h-1 bg-orange-400 rounded-full animate-pulse" />
                  <span className="w-1 h-1 bg-orange-400 rounded-full animate-pulse delay-75" />
                  <span className="w-1 h-1 bg-orange-400 rounded-full animate-pulse delay-150" />
                </div>
              </div>
            </div>
          )}

          {/* 加载状态 */}
          {isLoading && !currentStream && activeTools.length === 0 && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shrink-0 mr-2 self-start">
                <Sparkles size={13} className="text-white" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-white border border-gray-100 rounded-bl-md shadow-sm">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 size={14} className="animate-spin text-orange-500" />
                  <span>正在思考...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 快捷问题 */}
        {messages.length <= 1 && !isLoading && (
          <div className="shrink-0 px-4 pb-2">
            <p className="text-[10px] text-gray-400 mb-2">你可以这样问：</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  className="shrink-0 px-3 py-1.5 bg-white border border-orange-200 text-orange-600 text-xs rounded-full hover:bg-orange-50 transition-colors"
                  onClick={() => handleSend(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 输入栏 */}
        <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-2.5 flex items-center gap-2 z-10">
          <input
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-orange-200 transition-shadow"
            placeholder="请输入问题，如：幼猫吃什么粮好？"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              inputValue.trim() && !isLoading
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-200 text-gray-400'
            }`}
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
