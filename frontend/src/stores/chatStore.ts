import { create } from 'zustand'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  tool_calls?: any[]
  created_at: string
}

interface ChatSession {
  id: number
  title: string
  message_count: number
  updated_at: string
}

interface ChatState {
  sessions: ChatSession[]
  currentSessionId: number | null
  messages: ChatMessage[]
  isLoading: boolean
  setSessions: (sessions: ChatSession[]) => void
  setCurrentSessionId: (id: number | null) => void
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  setIsLoading: (loading: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isLoading: false,
  setSessions: (sessions) => set({ sessions }),
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  setIsLoading: (loading) => set({ isLoading: loading }),
}))
