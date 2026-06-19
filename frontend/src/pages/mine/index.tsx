import React, { useState } from 'react'
import { Image, View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../stores/authStore'
import { AuthUser, wechatLogin } from '../../services/auth'
import { getMyPets } from '../../services/petApi'
import { getMyProfile, resolveAssetUrl } from '../../services/userApi'
import { FavoriteIcon, PawIcon, PackageIcon, ArrowRightIcon, AiAssistantIcon, ClockIcon, SettingsIcon } from '../../components/Icons'
import { useCompareStore } from '../../stores/compareStore'

function needsInitialProfile(user?: AuthUser | null) {
  const nickname = user?.nickname?.trim() || ''
  const hasDefaultNickname = !nickname || nickname === '微信用户' || /^用户[a-zA-Z0-9]{6}$/.test(nickname)
  return hasDefaultNickname || !user?.avatar_url
}

export default function MinePage() {
  const { user, isLoggedIn, logout, setUser } = useAuthStore()
  const { compareList } = useCompareStore()
  const [loading, setLoading] = useState(false)
  const [petCount, setPetCount] = useState(0)

  async function fetchPetCount() {
    try {
      const res = await getMyPets()
      setPetCount(res.total || 0)
    } catch {
      setPetCount(0)
    }
  }

  Taro.useDidShow(() => {
    if (isLoggedIn) {
      fetchPetCount()
    }
  })

  const handleLogin = async () => {
    setLoading(true)
    try {
      const loginRes = await wechatLogin()
      let currentUser = loginRes.user
      try {
        const profileRes = await getMyProfile()
        currentUser = profileRes.user
        setUser({
          id: profileRes.user.id,
          nickname: profileRes.user.nickname,
          avatar_url: profileRes.user.avatar_url,
        })
      } catch {
        currentUser = loginRes.user
      }
      Taro.showToast({ title: '登录成功', icon: 'success' })

      if (needsInitialProfile(currentUser)) {
        setTimeout(() => {
          Taro.navigateTo({ url: '/pages/mine/profile?firstLogin=1' })
        }, 500)
        return
      }

      const res = await getMyPets()
      if (!res.pets || res.pets.length === 0) {
        setTimeout(() => {
          Taro.navigateTo({ url: '/pages/mine/pets-create' })
        }, 1000)
      }
    } catch {
      Taro.showToast({ title: '登录失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    Taro.showToast({ title: '已退出登录', icon: 'success' })
  }

  const navigateToProfile = () => {
    Taro.navigateTo({ url: '/pages/mine/profile' })
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

  const navigateToChat = () => {
    Taro.switchTab({ url: '/pages/chat/index' })
  }

  return (
    <View className="flex flex-col h-screen bg-[#fff9f3]">
      {/* 用户信息 */}
      <View className="px-4 pt-4 pb-4 mini-fade-up">
        <View className="bg-white rounded-3xl p-5 border border-[#FFE2C2] mini-card-soft">
          <View className="flex items-center gap-4">
            <View className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center overflow-hidden">
              {isLoggedIn && user?.avatar_url ? (
                <Image
                  src={resolveAssetUrl(user.avatar_url)}
                  className="w-full h-full"
                  mode="aspectFill"
                />
              ) : (
                <PawIcon size={30} color="#f97316" />
              )}
            </View>
            <View className="flex-1">
              {isLoggedIn ? (
                <>
                  <View className="flex items-center gap-2">
                    <Text className="text-xl font-bold text-gray-900">{user?.nickname || '微信用户'}</Text>
                    <Text className="text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full">已登录</Text>
                  </View>
                  <Text className="text-sm text-gray-500 mt-1.5 block">管理宠物档案、收藏指南和选择对比</Text>
                </>
              ) : (
                <>
                  <Text className="text-xl font-bold text-gray-900 block">欢迎回来</Text>
                  <Text className="text-sm text-gray-500 mt-1.5 block">登录后同步宠物档案和养宠指南</Text>
                </>
              )}
            </View>
            {isLoggedIn && (
              <View
                className="h-8 px-3 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mini-press"
                onClick={navigateToProfile}
              >
                <Text className="text-xs font-medium text-orange-600">编辑</Text>
              </View>
            )}
          </View>

          <View className="grid grid-cols-3 gap-2 mt-5">
            <View
              className="bg-orange-50 rounded-2xl px-2 py-3.5 flex flex-col items-center mini-press"
              onClick={navigateToPets}
            >
              <PawIcon size={22} color="#f97316" />
              <Text className="text-sm font-semibold text-orange-700 mt-1">宠物档案</Text>
              <Text className="text-xs text-orange-700/70 mt-0.5">{petCount > 0 ? '推荐依据' : '完善信息'}</Text>
            </View>
            <View
              className="bg-blue-50 rounded-2xl px-2 py-3.5 flex flex-col items-center mini-press"
              onClick={navigateToChat}
            >
              <AiAssistantIcon size={22} color="#2563eb" />
              <Text className="text-sm font-semibold text-blue-700 mt-1">AI顾问</Text>
              <Text className="text-xs text-blue-700/70 mt-0.5">问养宠问题</Text>
            </View>
            <View
              className="bg-green-50 rounded-2xl px-2 py-3.5 flex flex-col items-center mini-press"
              onClick={navigateToCompare}
            >
              <PackageIcon size={22} color="#16a34a" />
              <Text className="text-sm font-semibold text-green-700 mt-1">选择对比</Text>
              <Text className="text-xs text-green-700/70 mt-0.5">{compareList.length > 0 ? '帮我判断' : '添加参考'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 功能列表 */}
      <View className="mx-4 mt-2 bg-white rounded-3xl overflow-hidden border border-[#F2E7DA] mini-card-soft mini-fade-up">
        <View
          className="px-4 py-4 flex items-center justify-between border-b border-gray-100 mini-press"
          onClick={navigateToPets}
        >
          <View className="flex items-center gap-2">
            <View className="w-8 h-8 rounded-2xl bg-orange-50 flex items-center justify-center">
              <PawIcon size={17} color="#f97316" />
            </View>
            <Text className="text-sm text-gray-800">宠物档案</Text>
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
            <Text className="text-sm text-gray-800">收藏指南</Text>
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
            <Text className="text-sm text-gray-800">选择对比</Text>
          </View>
          <ArrowRightIcon size={15} color="#9ca3af" />
        </View>

        <View className="px-4 py-4 flex items-center justify-between border-b border-gray-100 mini-press">
          <View className="flex items-center gap-2">
            <View className="w-8 h-8 rounded-2xl bg-gray-50 flex items-center justify-center">
              <ClockIcon size={17} color="#64748b" />
            </View>
            <Text className="text-sm text-gray-800">最近查看</Text>
          </View>
          <ArrowRightIcon size={15} color="#9ca3af" />
        </View>

        <View className="px-4 py-4 flex items-center justify-between mini-press">
          <View className="flex items-center gap-2">
            <View className="w-8 h-8 rounded-2xl bg-gray-50 flex items-center justify-center">
              <SettingsIcon size={17} color="#64748b" />
            </View>
            <Text className="text-sm text-gray-800">设置</Text>
          </View>
          <ArrowRightIcon size={15} color="#9ca3af" />
        </View>
      </View>

      {/* 登录/退出按钮 */}
      <View className="mt-6 px-4 pb-6">
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
