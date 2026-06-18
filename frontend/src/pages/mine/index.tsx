import React, { useState, useEffect } from 'react'
import { Button, Image, Input, View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../stores/authStore'
import { wechatLogin } from '../../services/auth'
import { getMyPets } from '../../services/petApi'
import { resolveAssetUrl, updateMyProfile, uploadMyAvatar } from '../../services/userApi'
import { FavoriteIcon, PawIcon, PackageIcon, ArrowRightIcon, AiAssistantIcon, ClockIcon, SettingsIcon } from '../../components/Icons'
import { useCompareStore } from '../../stores/compareStore'

export default function MinePage() {
  const { user, isLoggedIn, logout, setUser } = useAuthStore()
  const { compareList } = useCompareStore()
  const [loading, setLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [profileNickname, setProfileNickname] = useState('')
  const [petCount, setPetCount] = useState(0)

  useEffect(() => {
    if (isLoggedIn) {
      fetchPetCount()
    }
  }, [isLoggedIn])

  useEffect(() => {
    setProfileNickname(user?.nickname || '')
  }, [user?.nickname])

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

  const handleChooseAvatar = async (event: any) => {
    const avatarUrl = event.detail?.avatarUrl
    if (!avatarUrl || !isLoggedIn) return

    setAvatarUploading(true)
    try {
      const res = await uploadMyAvatar(avatarUrl)
      setUser({
        id: res.user.id,
        nickname: res.user.nickname,
        avatar_url: res.user.avatar_url,
      })
      Taro.showToast({ title: '头像已更新', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: '头像上传失败', icon: 'none' })
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!isLoggedIn || profileSaving) return
    const nickname = profileNickname.trim()
    if (!nickname) {
      Taro.showToast({ title: '请填写昵称', icon: 'none' })
      return
    }

    setProfileSaving(true)
    try {
      const res = await updateMyProfile({ nickname })
      setUser({
        id: res.user.id,
        nickname: res.user.nickname,
        avatar_url: res.user.avatar_url,
      })
      Taro.showToast({ title: '资料已保存', icon: 'success' })
    } catch {
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setProfileSaving(false)
    }
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
            {isLoggedIn ? (
              <Button
                openType="chooseAvatar"
                onChooseAvatar={handleChooseAvatar}
                className="mini-avatar-button w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center overflow-hidden"
              >
                {user?.avatar_url ? (
                  <Image
                    src={resolveAssetUrl(user.avatar_url)}
                    className="w-full h-full"
                    mode="aspectFill"
                  />
                ) : (
                  <PawIcon size={30} color="#f97316" />
                )}
              </Button>
            ) : (
              <View className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center overflow-hidden">
                <PawIcon size={30} color="#f97316" />
              </View>
            )}
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
          </View>

          {isLoggedIn && (
            <View className="mt-4 flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2">
              <Input
                type="nickname"
                value={profileNickname}
                placeholder="填写微信昵称"
                className="flex-1 text-sm text-gray-800"
                onInput={(event) => setProfileNickname(event.detail.value)}
              />
              <View
                className={`px-3 py-1.5 rounded-full ${profileSaving || avatarUploading ? 'bg-gray-200' : 'bg-orange-500'} mini-press`}
                onClick={handleSaveProfile}
              >
                <Text className={`text-xs font-medium ${profileSaving || avatarUploading ? 'text-gray-400' : 'text-white'}`}>
                  {profileSaving ? '保存中' : '保存'}
                </Text>
              </View>
            </View>
          )}

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
