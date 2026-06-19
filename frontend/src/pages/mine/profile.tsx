import React, { useState } from 'react'
import { Button, Image, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { PawIcon } from '../../components/Icons'
import { useAuthStore } from '../../stores/authStore'
import { resolveAssetUrl, updateMyProfile, uploadMyAvatar } from '../../services/userApi'

function isRemoteAsset(url: string) {
  return /^https?:\/\//.test(url) || url.startsWith('/uploads/')
}

export default function MineProfilePage() {
  const { user, isLoggedIn, setUser } = useAuthStore()
  const [nickname, setNickname] = useState(() => user?.nickname || '')
  const [avatarUrl, setAvatarUrl] = useState(() => user?.avatar_url || '')
  const [saving, setSaving] = useState(false)
  const firstLogin = Taro.getCurrentInstance().router?.params?.firstLogin === '1'

  const goBack = () => {
    if (firstLogin) {
      Taro.switchTab({ url: '/pages/mine/index' })
      return
    }
    Taro.navigateBack()
  }

  const handleChooseAvatar = (event: { detail?: { avatarUrl?: string } }) => {
    const nextAvatarUrl = event.detail?.avatarUrl
    if (nextAvatarUrl) {
      setAvatarUrl(nextAvatarUrl)
    }
  }

  const handleSave = async () => {
    if (!isLoggedIn || !user || saving) return

    const nextNickname = nickname.trim()
    if (!nextNickname) {
      Taro.showToast({ title: '请填写昵称', icon: 'none' })
      return
    }

    setSaving(true)
    try {
      let uploadedUser = user
      if (avatarUrl && !isRemoteAsset(avatarUrl)) {
        const avatarRes = await uploadMyAvatar(avatarUrl)
        uploadedUser = avatarRes.user
      }

      const profileRes = await updateMyProfile({ nickname: nextNickname })
      setUser({
        id: profileRes.user.id,
        nickname: profileRes.user.nickname,
        avatar_url: profileRes.user.avatar_url || uploadedUser.avatar_url,
      })
      Taro.showToast({ title: '资料已保存', icon: 'success' })
      setTimeout(goBack, 500)
    } catch {
      Taro.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <View className="flex flex-col items-center justify-center h-screen bg-[#fff9f3] text-gray-400">
        <Text className="text-sm">请先登录</Text>
      </View>
    )
  }

  const displayAvatarUrl = avatarUrl && isRemoteAsset(avatarUrl) ? resolveAssetUrl(avatarUrl) : avatarUrl

  return (
    <View className="flex flex-col h-screen bg-[#fff9f3]">
      <View className="shrink-0 bg-white px-4 py-2.5 flex items-center gap-3 border-b border-gray-100">
        <Text className="text-gray-600" onClick={goBack}>←</Text>
        <Text className="flex-1 text-sm font-bold text-gray-800">个人信息</Text>
      </View>

      <View className="flex-1 overflow-y-auto px-4 py-5">
        <View className="bg-white rounded-3xl p-5 border border-[#FFE2C2] mini-card-soft">
          <View className="items-center flex flex-col">
            <Button
              openType="chooseAvatar"
              onChooseAvatar={handleChooseAvatar}
              className="mini-avatar-button w-24 h-24 rounded-3xl bg-orange-50 flex items-center justify-center overflow-hidden"
            >
              {displayAvatarUrl ? (
                <Image
                  src={displayAvatarUrl}
                  className="w-full h-full"
                  mode="aspectFill"
                />
              ) : (
                <PawIcon size={38} color="#f97316" />
              )}
            </Button>
            <Text className="text-xs text-gray-400 mt-3">点击头像使用微信头像</Text>
          </View>

          <View className="mt-6">
            <Text className="text-xs text-gray-400 mb-2 block">昵称</Text>
            <View className="h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 flex items-center">
              <Input
                type="nickname"
                value={nickname}
                placeholder="使用微信昵称或输入昵称"
                className="flex-1 text-sm text-gray-800"
                onInput={(event) => setNickname(event.detail.value)}
                onBlur={(event) => setNickname(event.detail.value)}
              />
            </View>
          </View>

          {firstLogin && (
            <Text className="text-xs text-gray-400 mt-3 block">
              完善后会在收藏、评价和宠物档案中展示你的头像昵称
            </Text>
          )}
        </View>
      </View>

      <View className="shrink-0 px-4 pb-6">
        <View
          className={`w-full py-3 rounded-full text-center mini-press ${
            saving ? 'bg-gray-200' : 'bg-orange-500 shadow-lg shadow-orange-200'
          }`}
          onClick={handleSave}
        >
          <Text className={`text-sm font-medium ${saving ? 'text-gray-400' : 'text-white'}`}>
            {saving ? '保存中...' : '保存'}
          </Text>
        </View>
      </View>
    </View>
  )
}
