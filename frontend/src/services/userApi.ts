import Taro from '@tarojs/taro'
import { API_BASE_URL } from '../config/env'
import { apiClient } from './api'
import { useAuthStore } from '../stores/authStore'

export interface UserProfile {
  id: number
  nickname: string | null
  avatar_url: string | null
}

function getApiOrigin() {
  return API_BASE_URL.replace(/\/v1\/?$/, '')
}

export function resolveAssetUrl(url?: string | null) {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  if (url.startsWith('/uploads/')) return `${API_BASE_URL}${url}`
  return `${getApiOrigin()}${url.startsWith('/') ? url : `/${url}`}`
}

export async function updateMyProfile(data: {
  nickname?: string
  avatar_url?: string
}): Promise<{ user: UserProfile }> {
  return apiClient.put('/users/me', data)
}

export async function uploadMyAvatar(filePath: string): Promise<{
  avatar_url: string
  user: UserProfile
}> {
  const token = useAuthStore.getState().token
  const res = await Taro.uploadFile({
    url: `${API_BASE_URL}/users/me/avatar`,
    filePath,
    name: 'file',
    header: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`HTTP ${res.statusCode}`)
  }

  const payload = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  if (payload.code !== 0) {
    throw new Error(payload.message || 'Upload avatar failed')
  }

  return payload.data
}
