import Taro from '@tarojs/taro'
import { apiClient } from './api'
import { useAuthStore } from '../stores/authStore'

const MOCK_TOKEN = 'mock_h5_token_for_dev'
const MOCK_USER = {
  id: 1,
  nickname: 'H5调试用户',
  avatar_url: '',
}

function isH5() {
  const env = Taro.getEnv()
  return env === Taro.ENV_TYPE.WEB
}

export function initMockLogin() {
  if (isH5()) {
    useAuthStore.getState().setToken(MOCK_TOKEN)
    useAuthStore.getState().setUser(MOCK_USER)
    apiClient.setToken(MOCK_TOKEN)
    console.log('[Auth] H5 mock login initialized')
  }
}

export async function wechatLogin() {
  if (isH5()) {
    initMockLogin()
    return { token: MOCK_TOKEN, user: MOCK_USER }
  }

  try {
    const { code } = await Taro.login()

    let encryptedData: string | undefined
    let iv: string | undefined
    try {
      const userInfoRes = await Taro.getUserInfo({ withCredentials: true, lang: 'zh_CN' })
      encryptedData = userInfoRes.encryptedData as string
      iv = userInfoRes.iv as string
    } catch {
      // user hasn't authorized, continue with default info
    }

    const res = await apiClient.post('/auth/wechat-login', {
      code,
      encrypted_data: encryptedData,
      iv,
    })
    
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

  // H5 环境下自动 mock 登录
  if (isH5()) {
    initMockLogin()
    return true
  }

  return false
}
