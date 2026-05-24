import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../stores/authStore'
import { wechatLogin } from '../../services/auth'
import { getMyPets } from '../../services/petApi'
import { FavoriteIcon } from '../../components/Icons'

export default function MinePage() {
  const { user, isLoggedIn, logout } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [petCount, setPetCount] = useState(0)

  useEffect(() => {
    if (isLoggedIn) {
      fetchPetCount()
    }
  }, [isLoggedIn])

  const fetchPetCount = async () => {
    try {
      const res = await getMyPets()
      setPetCount(res.total || 0)
    } catch {
      setPetCount(0)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    try {
      await wechatLogin()
      Taro.showToast({ title: '登录成功', icon: 'success' })
      const res = await getMyPets()
      if (!res.pets || res.pets.length === 0) {
        setTimeout(() => {
          Taro.navigateTo({ url: '/pages/mine/pets-create' })
        }, 1000)
      }
    } catch (error) {
      Taro.showToast({ title: '登录失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    Taro.showToast({ title: '已退出登录', icon: 'success' })
  }

  const navigateToFavorites = () => {
    Taro.navigateTo({ url: '/pages/mine/favorites' })
  }

  const navigateToCompare = () => {
    Taro.navigateTo({ url: '/pages/product/compare' })
  }

  const navigateToPets = () => {
    Taro.navigateTo({ url: '/pages/mine/pets' })
  }

  return (
    <View className="flex flex-col h-screen bg-gray-50">
      {/* 用户信息 */}
      <View className="bg-white px-4 py-8">
        <View className="flex items-center gap-4">
          <View className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
            <Text className="text-2xl">{isLoggedIn ? '👤' : '🐱'}</Text>
          </View>
          <View className="flex-1">
            {isLoggedIn ? (
              <>
                <Text className="text-lg font-bold text-gray-800">{user?.nickname || '用户'}</Text>
                <Text className="text-xs text-gray-400 mt-1">已登录</Text>
              </>
            ) : (
              <>
                <Text className="text-lg font-bold text-gray-800">未登录</Text>
                <Text className="text-xs text-gray-400 mt-1">点击登录享受更多功能</Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* 功能列表 */}
      <View className="mt-4 bg-white">
        <View
          className="px-4 py-4 flex items-center justify-between border-b border-gray-100 active:bg-gray-50"
          onClick={navigateToPets}
        >
          <View className="flex items-center gap-2">
            <Text className="text-lg">🐾</Text>
            <Text className="text-sm text-gray-800">宠物管理</Text>
          </View>
          <View className="flex items-center gap-1">
            {petCount > 0 && (
              <Text className="text-xs text-orange-500">{petCount}只</Text>
            )}
            <Text className="text-gray-400">→</Text>
          </View>
        </View>

        <View
          className="px-4 py-4 flex items-center justify-between border-b border-gray-100 active:bg-gray-50"
          onClick={navigateToFavorites}
        >
          <View className="flex items-center gap-2">
            <FavoriteIcon size={18} color="#6b7280" />
            <Text className="text-sm text-gray-800">我的收藏</Text>
          </View>
          <Text className="text-gray-400">→</Text>
        </View>

        <View
          className="px-4 py-4 flex items-center justify-between border-b border-gray-100 active:bg-gray-50"
          onClick={navigateToCompare}
        >
          <Text className="text-sm text-gray-800">商品对比</Text>
          <Text className="text-gray-400">→</Text>
        </View>

        <View className="px-4 py-4 flex items-center justify-between border-b border-gray-100">
          <Text className="text-sm text-gray-800">浏览历史</Text>
          <Text className="text-gray-400">→</Text>
        </View>

        <View className="px-4 py-4 flex items-center justify-between">
          <Text className="text-sm text-gray-800">设置</Text>
          <Text className="text-gray-400">→</Text>
        </View>
      </View>

      {/* 登录/退出按钮 */}
      <View className="mt-8 px-4">
        {isLoggedIn ? (
          <View
            className="w-full py-3 bg-gray-200 text-gray-600 text-sm font-medium rounded-full text-center"
            onClick={handleLogout}
          >
            <Text>退出登录</Text>
          </View>
        ) : (
          <View
            className="w-full py-3 bg-orange-500 text-white text-sm font-medium rounded-full text-center"
            onClick={handleLogin}
          >
            <Text>{loading ? '登录中...' : '微信登录'}</Text>
          </View>
        )}
      </View>
    </View>
  )
}
