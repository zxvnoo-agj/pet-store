import { apiClient } from './api'
import type { AssistantMemory, AssistantMemorySections } from '../types/chat'

export async function getAssistantMemory(): Promise<AssistantMemory> {
  return apiClient.get<AssistantMemory>('/chat/memory')
}

export async function updateAssistantMemory(
  sections: AssistantMemorySections
): Promise<AssistantMemory> {
  return apiClient.put<AssistantMemory>('/chat/memory', { sections })
}

export async function updateAssistantMemorySettings(enabled: boolean): Promise<{
  enabled: boolean
  last_updated_at?: string | null
}> {
  return apiClient.patch('/chat/memory/settings', { enabled })
}

export async function clearAssistantMemory(): Promise<AssistantMemory> {
  return apiClient.delete<AssistantMemory>('/chat/memory')
}
