import { useEffect, useState } from 'react'
import { useLaunch } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { initMockLogin } from './services/auth'
import './index.css'

function App({ children }: { children: React.ReactNode }) {
  const [showPrivacy, setShowPrivacy] = useState(false)

  useLaunch(() => {
    console.log('App launched.')
    const consented = Taro.getStorageSync('privacy_consented')
    if (!consented) {
      setShowPrivacy(true)
    } else {
      initMockLogin()
    }
  })

  useEffect(() => {
    // App level side effects
  }, [])

  const handleAgree = () => {
    Taro.setStorageSync('privacy_consented', 'true')
    setShowPrivacy(false)
    initMockLogin()
  }

  const handleViewDetail = () => {
    Taro.navigateTo({ url: '/pages/privacy/index' })
  }

  return (
    <>
      {children}
      {showPrivacy && (
        <View className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <Text className="text-lg font-bold text-gray-900 text-center block mb-2">隐私协议</Text>
            <Text className="text-sm text-gray-500 text-center block mb-4">
              感谢您使用宠物用品助手！在开始之前，请阅读并同意我们的隐私协议。
            </Text>
            <View className="bg-gray-50 rounded-xl p-4 mb-4 max-h-40 overflow-y-auto">
              <Text className="text-xs text-gray-600 leading-relaxed block">
                我们可能会收集您的微信昵称、头像、对话内容等信息，用于提供和优化宠物用品推荐服务。我们承诺不会将您的个人信息出售给第三方。详细内容请查看完整协议。
              </Text>
            </View>
            <View
              className="w-full py-3 bg-orange-500 rounded-xl text-center mb-3"
              onClick={handleAgree}
            >
              <Text className="text-white font-medium text-base">同意并继续</Text>
            </View>
            <View
              className="w-full py-2 text-center"
              onClick={handleViewDetail}
            >
              <Text className="text-orange-500 text-sm">查看完整协议</Text>
            </View>
          </View>
        </View>
      )}
    </>
  )
}

export default App
