import React, { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../stores/authStore'
import { wechatLogin } from '../../services/auth'
import { getMyPets } from '../../services/petApi'
import { FavoriteIcon, PawIcon, PackageIcon, ArrowRightIcon } from '../../components/Icons'

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
    <View className="flex flex-col h-screen bg-[#fff8f2]">
      {/* 用户信息 */}
      <View className="px-4 pt-8 pb-4 mini-fade-up">
        <View className="bg-white rounded-3xl p-5 border border-orange-100 mini-card">
          <View className="flex items-center gap-4">
            <View className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center">
              <PawIcon size={30} color="#f97316" />
            </View>
            <View className="flex-1">
              {isLoggedIn ? (
                <>
                  <View className="flex items-center gap-2">
                    <Text className="text-xl font-bold text-gray-900">{user?.nickname || '微信用户'}</Text>
                    <Text className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full">已登录</Text>
                  </View>
                  <Text className="text-xs text-gray-500 mt-1">管理宠物档案、收藏和对比清单</Text>
                </>
              ) : (
                <>
                  <Text className="text-xl font-bold text-gray-900">欢迎回来</Text>
                  <Text className="text-xs text-gray-500 mt-1">登录后同步宠物档案和收藏</Text>
                </>
              )}
            </View>
          </View>

          <View className="grid grid-cols-3 gap-2 mt-5">
            <View className="bg-orange-50 rounded-2xl py-3 text-center">
              <Text className="text-lg font-bold text-orange-600">{petCount}</Text>
              <Text className="text-[10px] text-orange-700/70 mt-0.5">宠物档案</Text>
            </View>
            <View className="bg-blue-50 rounded-2xl py-3 text-center">
              <Text className="text-lg font-bold text-blue-600">AI</Text>
              <Text className="text-[10px] text-blue-700/70 mt-0.5">顾问记录</Text>
            </View>
            <View className="bg-green-50 rounded-2xl py-3 text-center">
              <Text className="text-lg font-bold text-green-600">比</Text>
              <Text className="text-[10px] text-green-700/70 mt-0.5">商品对比</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 功能列表 */}
      <View className="mx-4 mt-2 bg-white rounded-3xl overflow-hidden border border-orange-100 mini-card mini-fade-up">
        <View
          className="px-4 py-4 flex items-center justify-between border-b border-gray-100 mini-press"
          onClick={navigateToPets}
        >
          <View className="flex items-center gap-2">
            <View className="w-8 h-8 rounded-2xl bg-orange-50 flex items-center justify-center">
              <PawIcon size={17} color="#f97316" />
            </View>
            <Text className="text-sm text-gray-800">宠物管理</Text>
          </View>
          <View className="flex items-center gap-1">
            {petCount > 0 && (
              <Text className="text-xs text-orange-500">{petCount}只</Text>
            )}
            <ArrowRightIcon size={15} color="#9ca3af" />
          </View>
        </View>

        <View
          className="px-4 py-4 flex items-center justify-between border-b border-gray-100 mini-press"
          onClick={navigateToFavorites}
        >
          <View className="flex items-center gap-2">
            <View className="w-8 h-8 rounded-2xl bg-red-50 flex items-center justify-center">
              <FavoriteIcon size={17} color="#ef4444" />
            </View>
            <Text className="text-sm text-gray-800">我的收藏</Text>
          </View>
          <ArrowRightIcon size={15} color="#9ca3af" />
        </View>

        <View
          className="px-4 py-4 flex items-center justify-between border-b border-gray-100 mini-press"
          onClick={navigateToCompare}
        >
          <View className="flex items-center gap-2">
            <View className="w-8 h-8 rounded-2xl bg-blue-50 flex items-center justify-center">
              <PackageIcon size={17} color="#2563eb" />
            </View>
            <Text className="text-sm text-gray-800">商品对比</Text>
          </View>
          <ArrowRightIcon size={15} color="#9ca3af" />
        </View>

        <View className="px-4 py-4 flex items-center justify-between border-b border-gray-100">
          <Text className="text-sm text-gray-800">浏览历史</Text>
          <ArrowRightIcon size={15} color="#9ca3af" />
        </View>

        <View className="px-4 py-4 flex items-center justify-between">
          <Text className="text-sm text-gray-800">设置</Text>
          <ArrowRightIcon size={15} color="#9ca3af" />
        </View>
      </View>

      {/* 登录/退出按钮 */}
      <View className="mt-8 px-4">
        {isLoggedIn ? (
          <View
            className="w-full py-3 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-full text-center mini-press"
            onClick={handleLogout}
          >
            <Text>退出登录</Text>
          </View>
        ) : (
          <View
            className="w-full py-3 bg-orange-500 text-white text-sm font-medium rounded-full text-center shadow-lg shadow-orange-200 mini-press"
            onClick={handleLogin}
          >
            <Text>{loading ? '登录中...' : '微信登录'}</Text>
          </View>
        )}
      </View>
    </View>
  )
}
