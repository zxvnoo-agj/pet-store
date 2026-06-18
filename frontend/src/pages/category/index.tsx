import React, { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { apiClient } from '../../services/api'
import { SearchIcon, PetTypeIcon, CategoryIcon } from '../../components/Icons'

const petTypes = [
  { id: 'cat', name: '猫咪' },
  { id: 'dog', name: '狗狗' },
  { id: 'bird', name: '鸟类' },
  { id: 'fish', name: '水族' },
]

const NEED_SCENES = [
  { title: '幼宠喂养', subtitle: '成长营养' },
  { title: '换粮过渡', subtitle: '降低不适' },
  { title: '肠胃敏感', subtitle: '低敏判断' },
  { title: '美毛护理', subtitle: '皮毛状态' },
  { title: '除臭清洁', subtitle: '环境管理' },
  { title: '出行用品', subtitle: '外出准备' },
]

interface Category {
  id: number
  name: string
  pet_type: string
  icon: string | null
  sort_order: number
  children?: Category[]
}

export default function CategoryPage() {
  const [activePet, setActivePet] = useState('cat')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchCategories() {
    try {
      const res = await apiClient.get('/categories')
      setCategories(res.categories || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const filteredCategories = categories.filter(
    (c) => c.pet_type === activePet && !c.children
  )

  const parentCategories = categories.filter(
    (c) => c.pet_type === activePet && c.children && c.children.length > 0
  )

  const navigateToSearch = () => {
    Taro.navigateTo({ url: '/pages/search/index' })
  }

  const navigateToProducts = (categoryId: number, categoryName: string) => {
    Taro.navigateTo({
      url: `/pages/product/list?petType=${activePet}&categoryId=${categoryId}&category=${categoryName}`,
    })
  }

  const navigateToBrand = (brand: string) => {
    Taro.navigateTo({
      url: `/pages/product/list?brand=${brand}`,
    })
  }

  const navigateToNeed = (need: string) => {
    Taro.navigateTo({
      url: `/pages/product/list?petType=${activePet}&search=${encodeURIComponent(need)}`,
    })
  }

  if (loading) {
    return (
      <View className="flex flex-col h-screen bg-white items-center justify-center">
        <Text className="text-gray-400">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="flex flex-col h-screen bg-[#fff9f3]">
      {/* 搜索栏 */}
      <View className="px-4 py-3 bg-white border-b border-[#F2E7DA]">
        <View
          className="flex items-center gap-2 bg-gray-50 rounded-full px-3.5 py-2.5 border border-gray-100 mini-press"
          onClick={navigateToSearch}
        >
          <SearchIcon size={15} color="#f97316" />
          <Text className="text-sm text-gray-400 flex-1">搜索猫粮、狗粮、用品...</Text>
          <Text className="text-xs text-gray-400">搜索</Text>
        </View>
      </View>

      {/* 分类布局 */}
      <View className="flex flex-1 overflow-hidden">
        {/* 左侧：宠物类型 */}
        <View className="w-24 bg-white flex flex-col items-center py-3 gap-1 shrink-0 overflow-y-auto border-r border-[#F2E7DA]">
          {petTypes.map((pet) => (
            <View
              key={pet.id}
              onClick={() => setActivePet(pet.id)}
              className={`flex flex-col items-center gap-1 py-3 px-1 w-full rounded-r-2xl relative mini-press ${
                activePet === pet.id
                  ? 'bg-orange-50 text-orange-500 font-medium'
                  : 'text-gray-500'
              }`}
            >
              <View className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                activePet === pet.id ? 'bg-orange-500' : 'bg-gray-50'
              }`}>
                <PetTypeIcon type={pet.id} size={21} color={activePet === pet.id ? '#ffffff' : '#6b7280'} />
              </View>
              <Text className="text-xs">{pet.name}</Text>
              {activePet === pet.id && (
                <View className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-orange-500 rounded-r" />
              )}
            </View>
          ))}
        </View>

        {/* 右侧：品类列表 */}
        <View className="flex-1 p-4 overflow-y-auto">
          <View className="mb-4 bg-white rounded-3xl px-4 py-4 border border-[#FFE2C2] mini-card-soft mini-fade-up">
            <Text className="text-lg font-bold text-gray-900">
              {petTypes.find((p) => p.id === activePet)?.name}选择指南
            </Text>
            <Text className="text-sm text-gray-500 mt-1 block">
              按需求、品类和资料来源辅助判断
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-bold text-gray-700 mb-2">按需求选</Text>
            <View className="grid grid-cols-2 gap-3">
              {NEED_SCENES.map((scene) => (
                <View
                  key={scene.title}
                  className="bg-white border border-[#F2E7DA] rounded-2xl px-3 py-3 mini-card-soft mini-press"
                  onClick={() => navigateToNeed(scene.title)}
                >
                  <Text className="text-sm font-semibold text-gray-900 block">{scene.title}</Text>
                  <Text className="text-xs text-gray-500 mt-1 block">{scene.subtitle}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 父分类（点击后查询所有子分类） */}
          {parentCategories.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-bold text-gray-700 mb-2">按品类选</Text>
              <View className="grid grid-cols-2 gap-3">
                {parentCategories.map((cat) => (
                  <View
                    key={cat.id}
                    className="flex flex-col items-center gap-2 py-4 bg-white border border-[#FFE2C2] rounded-2xl mini-card-soft mini-press"
                    onClick={() => navigateToProducts(cat.id, cat.name)}
                  >
                    <View className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center">
                      <CategoryIcon name={cat.name} size={23} color="#f97316" />
                    </View>
                    <Text className="text-sm text-gray-700 font-medium">{cat.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 子分类（直接点击） */}
          {filteredCategories.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-bold text-gray-700 mb-2">细分</Text>
              <View className="grid grid-cols-2 gap-3">
                {filteredCategories.map((cat) => (
                  <View
                    key={cat.id}
                    className="flex flex-col items-center gap-2 py-4 bg-white border border-[#F2E7DA] rounded-2xl mini-card-soft mini-press"
                    onClick={() => navigateToProducts(cat.id, cat.name)}
                  >
                    <View className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center">
                      <CategoryIcon name={cat.name} size={23} color="#94a3b8" />
                    </View>
                    <Text className="text-sm text-gray-700 font-medium">{cat.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 品牌推荐 */}
          <View className="mt-6 bg-white rounded-3xl p-4 border border-[#F2E7DA] mini-card-soft">
            <View className="flex items-center justify-between mb-3">
              <Text className="text-sm font-bold text-gray-900">常见资料来源</Text>
              <Text className="text-xs text-gray-400">参考</Text>
            </View>
            <View className="flex flex-wrap gap-2">
              {['皇家', '渴望', '爱肯拿', '巅峰', '网易严选', '素力高', 'Now Fresh', 'K9'].map(
                (brand) => (
                  <Text
                    key={brand}
                    className="px-3 py-1.5 bg-orange-50 text-gray-700 text-xs rounded-full font-medium"
                    onClick={() => navigateToBrand(brand)}
                  >
                    {brand}
                  </Text>
                )
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
