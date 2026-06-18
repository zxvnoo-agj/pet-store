import React, { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useAuthStore } from '../../stores/authStore'
import { getMyPets, deletePet } from '../../services/petApi'
import type { Pet } from '../../types'
import { PetTypeIcon, PawIcon, SparkleIcon, PackageIcon, AiAssistantIcon } from '../../components/Icons'

const SPECIES_NAMES: Record<string, string> = {
  cat: '猫咪',
  dog: '狗狗',
  bird: '鸟类',
  fish: '水族',
  reptile: '爬宠',
  small_pet: '小宠',
  other: '其他',
}

export default function PetsPage() {
  const { isLoggedIn } = useAuthStore()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isLoggedIn) {
      fetchPets()
    }
  }, [isLoggedIn])

  useDidShow(() => {
    if (isLoggedIn) {
      fetchPets()
    }
  })

  const fetchPets = async () => {
    try {
      const res = await getMyPets()
      setPets(res.pets || [])
    } catch (error) {
      console.error('Failed to fetch pets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    Taro.navigateTo({ url: '/pages/mine/pets-create' })
  }

  const handleEdit = (pet: Pet) => {
    Taro.navigateTo({ url: `/pages/mine/pets-create?id=${pet.id}` })
  }

  const handleDelete = async (pet: Pet) => {
    const res = await Taro.showModal({
      title: '确认删除',
      content: `确定要删除「${pet.nickname || SPECIES_NAMES[pet.species]}」吗？`,
    })
    if (res.confirm) {
      try {
        await deletePet(pet.id)
        Taro.showToast({ title: '已删除', icon: 'success' })
        fetchPets()
      } catch (error) {
        Taro.showToast({ title: '删除失败', icon: 'none' })
      }
    }
  }

  const getPetTags = (pet: Pet) => {
    const tags: string[] = []
    if (pet.age_months != null) {
      if (pet.age_months < 12) tags.push('幼宠成长')
      if (pet.age_months >= 84) tags.push('高龄照护')
    }
    if (pet.weight_kg != null && pet.weight_kg >= 6) tags.push('体重管理')
    if (tags.length === 0) tags.push('日常养护')
    return tags
  }

  if (!isLoggedIn) {
    return (
      <View className="flex flex-col items-center justify-center h-screen text-gray-400">
        <Text className="text-sm">请先登录</Text>
      </View>
    )
  }

  return (
    <View className="flex flex-col h-screen bg-[#fff9f3]">
      <View className="shrink-0 px-4 pt-4 pb-3 flex items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-gray-900 block">宠物档案</Text>
          <Text className="text-sm text-gray-500 mt-1 block">管理宠物信息，用于推荐更合适的商品</Text>
        </View>
        <View
          className="h-11 px-5 bg-orange-500 rounded-full flex items-center justify-center mini-press"
          onClick={handleAdd}
        >
          <Text className="text-sm font-semibold text-white">添加</Text>
        </View>
      </View>

      <View className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <View className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Text className="text-sm">加载中...</Text>
          </View>
        ) : pets.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-[#FFE2C2] mini-card-soft">
            <View className="w-16 h-16 rounded-3xl bg-orange-50 flex items-center justify-center mb-4">
              <PawIcon size={32} color="#f97316" />
            </View>
            <Text className="text-base font-semibold text-gray-900 mb-1">还没有宠物档案</Text>
            <Text className="text-sm text-gray-500 mb-5">添加后可获得更贴合的用品推荐</Text>
            <View
              className="px-6 py-2.5 bg-orange-500 rounded-full mini-press"
              onClick={handleAdd}
            >
              <Text className="text-sm font-semibold text-white">添加宠物</Text>
            </View>
          </View>
        ) : (
          <View className="space-y-4">
            {pets.map((pet) => (
              <View
                key={pet.id}
                className="bg-white rounded-3xl p-4 border border-[#FFE2C2] mini-card-soft"
              >
                <View className="flex items-center gap-3">
                  <View className="w-14 h-14 rounded-3xl bg-orange-50 flex items-center justify-center shrink-0">
                    <PetTypeIcon type={pet.species} size={30} color="#f97316" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-base font-semibold text-gray-900 truncate block">
                      {pet.nickname || SPECIES_NAMES[pet.species]}
                    </Text>
                    <Text className="text-sm text-gray-500 mt-1 block truncate">
                      {pet.breed ? pet.breed.name : SPECIES_NAMES[pet.species]}
                      {pet.age_months != null ? ` · ${pet.age_months}个月` : ''}
                      {pet.weight_kg != null ? ` · ${pet.weight_kg}kg` : ''}
                    </Text>
                  </View>
                  <View className="items-end">
                    <View
                      className="px-3 py-1.5 bg-gray-100 rounded-full mini-press"
                      onClick={() => handleEdit(pet)}
                    >
                      <Text className="text-sm text-gray-700">编辑</Text>
                    </View>
                    <Text
                      className="text-xs text-red-400 mt-2"
                      onClick={() => handleDelete(pet)}
                    >
                      删除
                    </Text>
                  </View>
                </View>
                <View className="flex flex-wrap gap-2 mt-3">
                  {getPetTags(pet).map((tag) => (
                    <Text key={tag} className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs rounded-full">
                      {tag}
                    </Text>
                  ))}
                </View>
              </View>
            ))}

            <View className="bg-white rounded-3xl p-4 border border-[#F2E7DA] mini-card-soft">
              <View className="flex items-center justify-between mb-3">
                <View>
                  <Text className="text-base font-semibold text-gray-900 block">根据档案推荐</Text>
                  <Text className="text-xs text-gray-500 mt-1 block">结合年龄、体重和品种生成用品建议</Text>
                </View>
                <SparkleIcon size={22} color="#f97316" />
              </View>
              <View className="grid grid-cols-3 gap-2">
                <View className="bg-orange-50 rounded-2xl px-2 py-3 flex flex-col items-center mini-press">
                  <PackageIcon size={20} color="#f97316" />
                  <Text className="text-xs font-medium text-gray-800 mt-1">换粮建议</Text>
                </View>
                <View className="bg-blue-50 rounded-2xl px-2 py-3 flex flex-col items-center mini-press">
                  <AiAssistantIcon size={20} color="#2563eb" />
                  <Text className="text-xs font-medium text-gray-800 mt-1">问AI顾问</Text>
                </View>
                <View className="bg-green-50 rounded-2xl px-2 py-3 flex flex-col items-center mini-press">
                  <PawIcon size={20} color="#16a34a" />
                  <Text className="text-xs font-medium text-gray-800 mt-1">用品清单</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
