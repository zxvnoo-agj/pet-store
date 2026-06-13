import React, { useState, useEffect, useRef } from 'react'
import { View, Text, Block } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import SpuCard from '../../components/SpuCard'
import ScenarioSection from '../../components/ScenarioSection'
import { SearchIcon, SparkleIcon, PawIcon, PetTypeIcon } from '../../components/Icons'
import { apiClient, searchSpusByKeywords, type Spu } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { getMyPets, getLastSelectedPet, setLastSelectedPet } from '../../services/petApi'
import { getScenariosByPetType } from '../../config/scenarios'
import type { Pet } from '../../types'

const defaultPetChoices = [
  { id: 'cat', name: '猫咪' },
  { id: 'dog', name: '狗狗' },
  { id: 'bird', name: '鸟类' },
  { id: 'fish', name: '水族' },
]

const PET_TYPE_MAP: Record<string, { name: string }> = {
  cat: { name: '猫咪' },
  dog: { name: '狗狗' },
  bird: { name: '鸟类' },
  fish: { name: '水族' },
  reptile: { name: '爬宠' },
  small_pet: { name: '小宠' },
  other: { name: '其他' },
}

const SPECIES_LABELS: Record<string, string> = {
  cat: '猫咪', dog: '狗狗', bird: '鸟类', fish: '水族',
  reptile: '爬宠', small_pet: '小宠', other: '其他',
}

const SPECIES_OPTIONS = ['cat', 'dog', 'bird', 'fish', 'reptile', 'small_pet']

export default function HomePage() {
  const { isLoggedIn } = useAuthStore()
  const [pets, setPets] = useState<Pet[]>([])
  const [activePetId, setActivePetId] = useState<number | string>('cat')
  const [recommendedSpus, setRecommendedSpus] = useState([])
  const [petsLoaded, setPetsLoaded] = useState(false)
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false)
  const [browsingOther, setBrowsingOther] = useState(false)
  const [browsingSpecies, setBrowsingSpecies] = useState<string | null>(null)

  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [scenarioResults, setScenarioResults] = useState<Spu[] | null>(null)
  const [scenarioError, setScenarioError] = useState<string | null>(null)
  const lastClickTimeRef = useRef(0)

  const loadPetsAndSelection = async () => {
    try {
      const result = await getMyPets()
      const myPets = result.pets || []
      setPets(myPets)
      setPetsLoaded(true)

      if (myPets.length > 0) {
        try {
          const lastSelected = await getLastSelectedPet()
          const lastPetId = lastSelected?.pet_id
          if (lastPetId && myPets.some(p => p.id === lastPetId)) {
            setActivePetId(lastPetId)
          } else {
            setActivePetId(myPets[0].id)
          }
        } catch {
          setActivePetId(myPets[0].id)
        }
      }
    } catch {
      setPetsLoaded(true)
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      loadPetsAndSelection()
    } else {
      setPets([])
      setActivePetId('cat')
      setPetsLoaded(true)
    }
  }, [isLoggedIn])

  useDidShow(() => {
    if (isLoggedIn) {
      loadPetsAndSelection()
    }
  })

  useEffect(() => {
    fetchRecommendedSpus()
  }, [activePetId])

  // 宠物类型切换时自动重置场景状态
  useEffect(() => {
    setActiveScenarioId(null)
    setScenarioResults(null)
    setScenarioError(null)
    setIsSearching(false)
  }, [activePetId])

  const getActiveSpecies = (): string => {
    if (browsingSpecies) return browsingSpecies
    if (typeof activePetId === 'number') {
      const pet = pets.find(p => p.id === activePetId)
      return pet?.species || 'cat'
    }
    return activePetId as string
  }

  const fetchRecommendedSpus = async () => {
    const species = getActiveSpecies()
    try {
      const res = await apiClient.get('/spus', {
        pet_type: species,
        page_size: 3,
      })
      const items = res.items || []
      setRecommendedSpus(items)
      if (!activeScenarioId) {
        setScenarioResults(null)
      }
    } catch (error) {
      setRecommendedSpus([])
      if (!activeScenarioId) {
        setScenarioResults(null)
      }
    }
  }

  const handlePetClick = async (petId: number | string) => {
    if (petId === 'other') {
      setShowSpeciesPicker(true)
      return
    }

    setActivePetId(petId)
    setBrowsingOther(false)
    setBrowsingSpecies(null)
    handleClearScenario()

    if (typeof petId === 'number') {
      try {
        await setLastSelectedPet(petId)
      } catch {}
    }
  }

  const handleSpeciesSelect = (species: string) => {
    setBrowsingOther(true)
    setBrowsingSpecies(species)
    setActivePetId(species)
    setShowSpeciesPicker(false)
    handleClearScenario()
  }

  const getActivePetName = () => {
    if (typeof activePetId === 'number') {
      const pet = pets.find(p => p.id === activePetId)
      if (pet) return pet.nickname || PET_TYPE_MAP[pet.species]?.name || pet.species
    }
    if (browsingSpecies) {
      return SPECIES_LABELS[browsingSpecies] || browsingSpecies
    }
    if (typeof activePetId === 'string') {
      const dp = defaultPetChoices.find(p => p.id === activePetId)
      if (dp) return dp.name
    }
    return '毛孩子'
  }

  const hasPets = pets.length > 0 && petsLoaded

  const navigateToSearch = () => {
    Taro.navigateTo({ url: '/pages/search/index' })
  }

  const handleScenarioClick = async (scenarioId: string) => {
    const now = Date.now()
    if (now - lastClickTimeRef.current < 300) return
    lastClickTimeRef.current = now

    const scenarios = getScenariosByPetType(activeSpecies)
    const scenario = scenarios.find((s) => s.id === scenarioId)
    if (!scenario) return

    setActiveScenarioId(scenarioId)
    setIsSearching(true)
    setScenarioError(null)

    try {
      const res = await searchSpusByKeywords(scenario.keywords, activeSpecies)
      setScenarioResults(res.items || [])
    } catch (err: any) {
      setScenarioError(err.message || '搜索失败，请稍后重试')
      setScenarioResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleClearScenario = () => {
    setActiveScenarioId(null)
    setScenarioResults(null)
    setScenarioError(null)
    setIsSearching(false)
  }

  const navigateToProducts = (petType: string) => {
    Taro.navigateTo({ url: `/pages/product/list?petType=${petType}` })
  }

  const activeSpecies = getActiveSpecies()
  const isBrowsingOther = browsingOther && browsingSpecies

  return (
    <View className="bg-[#fff8f2] min-h-screen">
      {/* 顶部欢迎区 */}
      <View className="px-5 pt-6 pb-2 mini-fade-up">
        <View className="bg-white rounded-3xl px-4 py-4 border border-orange-100 mini-card">
          <View className="flex items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xs text-orange-500 font-medium">下午好</Text>
              <Text className="text-xl font-bold text-gray-900 mt-1 leading-snug">
                今天给<Text className="text-orange-500">{getActivePetName()}</Text>挑点什么？
              </Text>
              <Text className="text-xs text-gray-500 mt-2 leading-relaxed">
                搜索、场景推荐和对比都在这里，先从最常买的需求开始。
              </Text>
            </View>
            <View className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
              <SparkleIcon size={24} color="#f97316" />
            </View>
          </View>
          <View
            onClick={navigateToSearch}
            className="mt-4 flex items-center gap-2 bg-gray-50 rounded-full px-4 py-3 border border-gray-100 mini-press"
          >
            <SearchIcon size={17} color="#f97316" />
            <Text className="text-sm text-gray-400 flex-1">搜索猫粮、狗粮、用品...</Text>
            <Text className="text-xs text-orange-400 mini-caret">→</Text>
          </View>
        </View>
      </View>

      {/* 宠物卡片/种类选择 */}
      <View className="px-5 pt-4 pb-2 mini-fade-up">
        <View className="flex items-center gap-3 overflow-x-auto py-1">
          {hasPets ? (
            <Block>
              {pets.map((pet) => {
                const isActive = activePetId === pet.id && !browsingOther
                return (
                  <View
                    key={pet.id}
                    onClick={() => handlePetClick(pet.id)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border shrink-0 ${
                      isActive
                        ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200'
                        : 'bg-white border-orange-100 text-gray-700'
                    }`}
                  >
                    <View className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-white/20' : 'bg-orange-50'
                    }`}>
                      <PetTypeIcon type={pet.species} size={17} color={isActive ? '#ffffff' : '#f97316'} />
                    </View>
                    <View className="text-left">
                      <Text className={`text-sm font-medium ${isActive ? 'text-white' : ''}`}>
                        {pet.nickname}
                      </Text>
                      {pet.breed?.name && (
                        <Text className={`text-xs mt-0.5 ${
                          isActive ? 'text-orange-100' : 'text-gray-400'
                        }`}>
                          {pet.breed.name}
                        </Text>
                      )}
                    </View>
                  </View>
                )
              })}
              <View
                key="other"
                onClick={() => handlePetClick('other')}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border shrink-0 ${
                  browsingOther
                    ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200'
                    : 'border-dashed border-orange-200 bg-white text-gray-400'
                }`}
              >
                <PawIcon size={15} color={browsingOther ? '#ffffff' : '#f97316'} />
                <Text className={`text-sm font-medium ${browsingOther ? 'text-white' : ''}`}>
                  选择其他
                </Text>
              </View>
            </Block>
          ) : (
            <Block>
              {defaultPetChoices.map((p) => {
                const isActive = !browsingOther && activePetId === p.id
                return (
                  <View
                    key={p.id}
                    onClick={() => handlePetClick(p.id)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border shrink-0 ${
                      isActive
                        ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200'
                        : 'bg-white border-orange-100 text-gray-700'
                    }`}
                  >
                    <View className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-white/20' : 'bg-orange-50'
                    }`}>
                      <PetTypeIcon type={p.id} size={17} color={isActive ? '#ffffff' : '#f97316'} />
                    </View>
                    <Text className="text-sm font-medium">{p.name}</Text>
                  </View>
                )
              })}
              <View
                key="other"
                onClick={() => {}}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-dashed border-orange-200 bg-white text-gray-400 shrink-0"
              >
                <PawIcon size={15} color="#f97316" />
                <Text className="text-sm font-medium">其他</Text>
              </View>
            </Block>
          )}
        </View>
      </View>

      {/* 浏览其他物种指示器 */}
      {isBrowsingOther && (
        <View className="px-5 pt-1">
        <View className="bg-white border border-orange-200 rounded-2xl px-3 py-2 mini-scale-in">
            <Text className="text-xs text-orange-600">
              正在浏览{SPECIES_LABELS[browsingSpecies!] || browsingSpecies}用品 · 点击宠物卡片切换回专属推荐
            </Text>
          </View>
        </View>
      )}

      {/* 种类选择弹窗 */}
      {showSpeciesPicker && (
        <View
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
          onClick={() => setShowSpeciesPicker(false)}
        >
          <View
            className="bg-white rounded-t-2xl w-full px-5 pt-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <Text className="text-base font-bold text-gray-800 mb-4 text-center">选择浏览种类</Text>
            <View className="grid grid-cols-3 gap-3">
              {SPECIES_OPTIONS.map((species) => {
                const info = PET_TYPE_MAP[species]
                return (
                  <View
                    key={species}
                    onClick={() => handleSpeciesSelect(species)}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl bg-gray-50 active:bg-gray-100"
                  >
                    <View className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
                      <PetTypeIcon type={species} size={23} color="#f97316" />
                    </View>
                    <Text className="text-sm text-gray-700">{info?.name || species}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        </View>
      )}

      {/* 场景快捷推荐 */}
      <ScenarioSection
        key={activeSpecies}
        scenarios={getScenariosByPetType(activeSpecies)}
        activeScenarioId={activeScenarioId}
        onScenarioClick={handleScenarioClick}
        onClear={handleClearScenario}
      />

      {/* 为你推荐 / 场景搜索结果 */}
      <View className="px-5 pt-6 pb-4 mini-fade-up">
        <View className="flex items-center justify-between mb-3">
          <Text className="text-base text-gray-900 font-bold">
            {activeScenarioId ? (
              <>
                <Text className="text-orange-500 font-medium">场景精选</Text>
                <Text className="text-gray-400"> · </Text>
                <Text>{getActivePetName()}</Text>
              </>
            ) : (
              <>
                给 <Text className="font-medium text-orange-500">{getActivePetName()}</Text> 的推荐
              </>
            )}
          </Text>
          {!activeScenarioId && (
            <Text
              className="text-[11px] text-orange-500 font-medium"
              onClick={() => navigateToProducts(activeSpecies)}
            >
              更多 →
            </Text>
          )}
        </View>

        {/* Loading */}
        {isSearching && (
          <View className="py-8 flex flex-col items-center justify-center">
            <View className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            <Text className="text-xs text-gray-400 mt-3">正在搜索相关商品...</Text>
          </View>
        )}

        {/* Error */}
        {!isSearching && scenarioError && (
          <View className="py-8 flex flex-col items-center justify-center">
            <Text className="text-sm text-gray-500">{scenarioError}</Text>
            <Text
              className="text-xs text-orange-500 mt-2"
              onClick={handleClearScenario}
            >
              清除筛选，查看全部推荐
            </Text>
          </View>
        )}

        {/* Empty */}
        {!isSearching && !scenarioError && activeScenarioId && scenarioResults?.length === 0 && (
          <View className="py-8 flex flex-col items-center justify-center">
            <Text className="text-sm text-gray-500">暂无相关商品，试试其他场景？</Text>
            <Text
              className="text-xs text-orange-500 mt-2"
              onClick={() => navigateToProducts(activeSpecies)}
            >
              查看更多商品 →
            </Text>
          </View>
        )}

        {/* Results */}
        {!isSearching && !scenarioError && (
          <View className="space-y-3">
            {(activeScenarioId ? scenarioResults : recommendedSpus)?.map((spu: any) => (
              <SpuCard key={spu.id} spu={spu} />
            ))}
          </View>
        )}
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
