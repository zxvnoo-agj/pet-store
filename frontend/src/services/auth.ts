import Taro from '@tarojs/taro'
import { apiClient } from './api'
import { useAuthStore } from '../stores/authStore'

export async function wechatLogin() {
  try {
    const { code } = await Taro.login({
      provider: 'weixin',
    })

    const res = await apiClient.post('/auth/wechat-login', { code })
    
    const { token, user } = res
    useAuthStore.getState().setToken(token)
    useAuthStore.getState().setUser(user)
    apiClient.setToken(token)
    
    return res
  } catch (error) {
    console.error('WeChat login failed:', error)
    throw error
  }
}

export async function checkLoginStatus() {
  const token = useAuthStore.getState().token
  if (token) {
    apiClient.setToken(token)
    return true
  }
  return false
}
