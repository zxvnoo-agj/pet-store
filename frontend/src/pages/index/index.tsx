import { useState, useEffect } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import ProductCard from '../../components/ProductCard'
import { apiClient } from '../../services/api'
import { useProductStore } from '../../stores/productStore'
import { useAuthStore } from '../../stores/authStore'

const defaultPetChoices = [
  { id: 'cat', name: '猫咪', icon: '🐱' },
  { id: 'dog', name: '狗狗', icon: '🐶' },
  { id: 'bird', name: '鸟类', icon: '🐦' },
  { id: 'fish', name: '水族', icon: '🐟' },
]

const PET_TYPE_MAP: Record<string, { name: string; icon: string }> = {
  cat: { name: '猫咪', icon: '🐱' },
  dog: { name: '狗狗', icon: '🐶' },
  bird: { name: '鸟类', icon: '🐦' },
  fish: { name: '水族', icon: '🐟' },
}

export default function HomePage() {
  const { isLoggedIn, user } = useAuthStore()
  const [activePetId, setActivePetId] = useState('cat')
  const [recommendedProducts, setRecommendedProducts] = useState([])

  // 获取用户的宠物列表
  const getUserPets = () => {
    if (!isLoggedIn || !user?.pet_types || user.pet_types.length === 0) {
      return []
    }
    return user.pet_types.map((type: string, index: number) => ({
      id: `my-${type}-${index}`,
      name: PET_TYPE_MAP[type]?.name || type,
      type,
      icon: PET_TYPE_MAP[type]?.icon || '🐾',
    }))
  }

  const myPets = getUserPets()

  useEffect(() => {
    // 初始化默认选中的宠物
    if (myPets.length > 0) {
      setActivePetId(myPets[0].id)
    } else {
      setActivePetId('cat')
    }
  }, [isLoggedIn, user])

  useEffect(() => {
    fetchRecommendedProducts()
  }, [activePetId])

  const fetchRecommendedProducts = async () => {
    const activeUserPet = myPets.find(p => p.id === activePetId)
    const activeDefaultPet = defaultPetChoices.find(p => p.id === activePetId)
    const petTypeKey = activeUserPet?.type || activeDefaultPet?.id || 'cat'

    try {
      const res = await apiClient.get('/products', {
        pet_type: petTypeKey,
        page_size: 3,
      })
      setRecommendedProducts(res.products || [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  const getPetDisplayList = () => {
    const list: Array<{ id: string; name: string; icon: string; subtitle?: string; isMine?: boolean }> = []

    // 登录用户的宠物
    myPets.forEach(pet => {
      list.push({
        id: pet.id,
        name: pet.name,
        icon: pet.icon,
        subtitle: '宠物',
        isMine: true,
      })
    })

    // 默认宠物类型（排除用户已选的）
    const userPetTypes = new Set(myPets.map(p => p.type))
    defaultPetChoices.forEach(p => {
      if (!userPetTypes.has(p.id)) {
        list.push({
          id: p.id,
          name: p.name,
          icon: p.icon,
          isMine: false,
        })
      }
    })

    list.push({ id: 'other', name: '其他', icon: '•••', subtitle: '' })

    return list
  }

  const petDisplayList = getPetDisplayList()

  const handlePetClick = (petId: string) => {
    if (petId === 'other') return
    setActivePetId(petId)
  }

  const navigateToSearch = () => {
    Taro.navigateTo({ url: '/pages/search/index' })
  }

  const navigateToChat = () => {
    Taro.navigateTo({ url: '/pages/chat/index' })
  }

  const navigateToProducts = (petType: string) => {
    Taro.navigateTo({ url: `/pages/product/list?petType=${petType}` })
  }

  const activeUserPet = myPets.find(p => p.id === activePetId)
  const activeDefaultPet = defaultPetChoices.find(p => p.id === activePetId)
  const petTypeKey = activeUserPet?.type || activeDefaultPet?.id || 'cat'

  // 获取当前展示宠物的名称
  const getActivePetName = () => {
    if (activeUserPet) return activeUserPet.name
    if (activeDefaultPet) return activeDefaultPet.name
    return '毛孩子'
  }

  return (
    <View className="bg-gray-50 min-h-screen">
      {/* 顶部欢迎区 */}
      <View className="px-5 pt-6 pb-2">
        <View>
          <Text className="text-xs text-gray-400">下午好 👋</Text>
          <Text className="text-lg font-bold text-gray-900 mt-0.5 leading-snug">
            今天想给{'\n'}
            <Text className="text-orange-500">{getActivePetName()}</Text> 看点什么？
          </Text>
        </View>
        <View
          onClick={navigateToSearch}
          className="mt-3 flex items-center gap-2 bg-white rounded-full px-4 py-2.5 shadow-sm border border-gray-100"
        >
          <Text className="text-gray-400 text-sm">🔍</Text>
          <Text className="text-sm text-gray-400 flex-1">搜索猫粮、狗粮、用品...</Text>
        </View>
      </View>

      {/* 我的宠物 */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex items-center gap-3 overflow-x-auto py-1">
          {petDisplayList.map((pet) => {
            const isActive = activePetId === pet.id
            const isOther = pet.id === 'other'

            return (
              <View
                key={pet.id}
                onClick={() => handlePetClick(pet.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border shrink-0 ${
                  isOther
                    ? 'border-dashed border-gray-200 bg-white text-gray-400'
                    : isActive
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white border-gray-100 text-gray-700'
                }`}
              >
                <Text className="text-lg">{isOther ? '•••' : pet.icon}</Text>
                <View className="text-left">
                  <Text className={`text-sm font-medium ${isOther ? 'text-gray-400' : ''}`}>
                    {pet.name}
                  </Text>
                  {pet.subtitle && (
                    <Text className={`text-[10px] mt-0.5 ${
                      isActive ? 'text-orange-100' : 'text-gray-400'
                    }`}>
                      {pet.isMine ? '我的' + pet.subtitle : pet.subtitle}
                    </Text>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      </View>

      {/* AI助手卡片 */}
      <View className="px-5 pt-5 pb-2">
        <View
          onClick={navigateToChat}
          className="w-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-2xl p-4 relative overflow-hidden"
        >
          <View className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
          <View className="absolute right-8 bottom-[-10px] w-12 h-12 bg-white/5 rounded-full" />

          <View className="relative flex items-center gap-3">
            <View className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <Text className="text-white text-xl">✨</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-white">问问 AI 助手</Text>
              <Text className="text-[11px] text-orange-100 mt-0.5">
                不知道选什么？直接问我
              </Text>
            </View>
            <Text className="text-white/70 text-xl">💬</Text>
          </View>
        </View>
      </View>

      {/* 为你推荐 */}
      <View className="px-5 pt-6 pb-4">
        <View className="flex items-center justify-between mb-3">
          <Text className="text-sm text-gray-800">
            给 <Text className="font-medium text-orange-500">{getActivePetName()}</Text> 的推荐
          </Text>
          <Text
            className="text-[11px] text-gray-400"
            onClick={() => navigateToProducts(petTypeKey)}
          >
            更多 →
          </Text>
        </View>
        <View className="space-y-3">
          {recommendedProducts.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </View>
      </View>

      {/* 底部提示 */}
      <View className="px-5 pb-8 text-center">
        <Text className="text-[10px] text-gray-300">
          产品信息来自真实用户评价，仅供参考
        </Text>
      </View>
    </View>
  )
}
