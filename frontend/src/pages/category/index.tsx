import { useState, useEffect } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useProductStore } from '../../stores/productStore'

const petTypes = [
  { id: 'cat', name: '猫咪', icon: '🐱' },
  { id: 'dog', name: '狗狗', icon: '🐶' },
  { id: 'bird', name: '鸟类', icon: '🐦' },
  { id: 'fish', name: '水族', icon: '🐟' },
]

const mockCategories = [
  { id: 1, name: '猫粮', icon: '🍖', petType: 'cat' },
  { id: 2, name: '猫砂', icon: '🧻', petType: 'cat' },
  { id: 3, name: '猫玩具', icon: '🧶', petType: 'cat' },
  { id: 4, name: '猫窝', icon: '🏠', petType: 'cat' },
  { id: 5, name: '狗粮', icon: '🍖', petType: 'dog' },
  { id: 6, name: '狗玩具', icon: '🎾', petType: 'dog' },
  { id: 7, name: '狗窝', icon: '🏠', petType: 'dog' },
  { id: 8, name: '牵引绳', icon: '🦮', petType: 'dog' },
]

export default function CategoryPage() {
  const [activePet, setActivePet] = useState('cat')
  const [categories, setCategories] = useState(mockCategories)

  const filteredCategories = categories.filter(c => c.petType === activePet)

  const navigateToSearch = () => {
    Taro.navigateTo({ url: '/pages/search/index' })
  }

  const navigateToProducts = (categoryName: string) => {
    Taro.navigateTo({
      url: `/pages/product/list?petType=${activePet}&category=${categoryName}`,
    })
  }

  const navigateToBrand = (brand: string) => {
    Taro.navigateTo({
      url: `/pages/product/list?brand=${brand}`,
    })
  }

  return (
    <View className="flex flex-col h-screen bg-white">
      {/* 搜索栏 */}
      <View className="px-4 py-2.5 border-b border-gray-100">
        <View
          className="flex items-center gap-2 bg-gray-100 rounded-full px-3.5 py-2"
          onClick={navigateToSearch}
        >
          <Text className="text-xs text-gray-400">搜索猫粮、狗粮、用品...🔍</Text>
        </View>
      </View>

      {/* 分类布局 */}
      <View className="flex flex-1 overflow-hidden">
        {/* 左侧：宠物类型 */}
        <View className="w-20 bg-gray-50 flex flex-col items-center py-3 gap-1 shrink-0 overflow-y-auto">
          {petTypes.map((pet) => (
            <View
              key={pet.id}
              onClick={() => setActivePet(pet.id)}
              className={`flex flex-col items-center gap-1 py-3 px-1 w-full rounded-r-xl relative ${
                activePet === pet.id
                  ? 'bg-white text-orange-500 font-medium'
                  : 'text-gray-500'
              }`}
            >
              <Text className="text-xl">{pet.icon}</Text>
              <Text className="text-xs">{pet.name}</Text>
              {activePet === pet.id && (
                <View className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-orange-500 rounded-r" />
              )}
            </View>
          ))}
        </View>

        {/* 右侧：品类列表 */}
        <View className="flex-1 p-4 overflow-y-auto">
          <View className="mb-4">
            <Text className="text-base font-bold text-gray-800">
              {petTypes.find(p => p.id === activePet)?.name}用品
            </Text>
            <Text className="text-xs text-gray-400 mt-0.5">共 {filteredCategories.length} 个分类</Text>
          </View>

          <View className="grid grid-cols-3 gap-3">
            {filteredCategories.map((cat) => (
              <View
                key={cat.id}
                className="flex flex-col items-center gap-2 py-4 bg-gray-50 rounded-xl active:bg-orange-50"
                onClick={() => navigateToProducts(cat.name)}
              >
                <Text className="text-3xl">{cat.icon}</Text>
                <Text className="text-xs text-gray-700 font-medium">{cat.name}</Text>
              </View>
            ))}
          </View>

          {/* 品牌推荐 */}
          <View className="mt-6">
            <Text className="text-sm font-bold text-gray-800 mb-3">热门品牌</Text>
            <View className="flex flex-wrap gap-2">
              {['皇家', '渴望', '爱肯拿', '巅峰', '网易严选', '素力高', 'Now Fresh', 'K9'].map((brand) => (
                <Text
                  key={brand}
                  className="px-3 py-1.5 bg-orange-50 text-orange-600 text-xs rounded-full font-medium"
                  onClick={() => navigateToBrand(brand)}
                >
                  {brand}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}
