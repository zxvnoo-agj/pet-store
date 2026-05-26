import React, { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useAuthStore } from '../../stores/authStore'
import { getMyPets, deletePet } from '../../services/petApi'
import type { Pet } from '../../types'

const SPECIES_ICONS: Record<string, string> = {
  cat: '🐱',
  dog: '🐶',
  bird: '🐦',
  fish: '🐟',
  reptile: '🦎',
  small_pet: '🐹',
  other: '🐾',
}

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

  const goBack = () => {
    Taro.navigateBack()
  }

  if (!isLoggedIn) {
    return (
      <View className="flex flex-col items-center justify-center h-screen text-gray-400">
        <Text className="text-sm">请先登录</Text>
      </View>
    )
  }

  return (
    <View className="flex flex-col h-screen bg-gray-50">
      <View className="shrink-0 bg-white px-4 py-2.5 flex items-center gap-3 border-b border-gray-100">
        <Text className="text-gray-600" onClick={goBack}>←</Text>
        <Text className="flex-1 text-sm font-bold text-gray-800">宠物管理</Text>
        <Text className="text-orange-500 text-sm font-medium" onClick={handleAdd}>
          + 添加
        </Text>
      </View>

      <View className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <View className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Text className="text-sm">加载中...</Text>
          </View>
        ) : pets.length === 0 ? (
          <View className="flex flex-col items-center justify-center py-20">
            <Text className="text-4xl mb-4">🐾</Text>
            <Text className="text-sm text-gray-400 mb-4">还没有添加宠物</Text>
            <View
              className="px-6 py-2 bg-orange-500 text-white text-sm rounded-full"
              onClick={handleAdd}
            >
              <Text>添加宠物</Text>
            </View>
          </View>
        ) : (
          <View className="space-y-3">
            {pets.map((pet) => (
              <View
                key={pet.id}
                className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm"
              >
                <View className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-2xl">
                  <Text>{SPECIES_ICONS[pet.species] || '🐾'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800">
                    {pet.nickname || SPECIES_NAMES[pet.species]}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-0.5">
                    {pet.breed ? pet.breed.name : SPECIES_NAMES[pet.species]}
                    {pet.age_months != null ? ` · ${pet.age_months}个月` : ''}
                    {pet.weight_kg != null ? ` · ${pet.weight_kg}kg` : ''}
                  </Text>
                </View>
                <View className="flex items-center gap-2">
                  <View
                    className="px-3 py-1 bg-gray-100 rounded-full"
                    onClick={() => handleEdit(pet)}
                  >
                    <Text className="text-xs text-gray-600">编辑</Text>
                  </View>
                  <View
                    className="px-3 py-1 bg-red-50 rounded-full"
                    onClick={() => handleDelete(pet)}
                  >
                    <Text className="text-xs text-red-500">删除</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
