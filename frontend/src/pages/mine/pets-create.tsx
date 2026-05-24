import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../stores/authStore'
import { createPet, getMyPets, getBreeds, updatePet } from '../../services/petApi'
import type { Pet, PetBreed } from '../../types'

const SPECIES_OPTIONS = [
  { value: 'cat', label: '猫咪', icon: '🐱' },
  { value: 'dog', label: '狗狗', icon: '🐶' },
  { value: 'bird', label: '鸟类', icon: '🐦' },
  { value: 'fish', label: '水族', icon: '🐟' },
  { value: 'reptile', label: '爬宠', icon: '🦎' },
  { value: 'small_pet', label: '小宠', icon: '🐹' },
  { value: 'other', label: '其他', icon: '🐾' },
]

export default function PetsCreatePage() {
  const { isLoggedIn } = useAuthStore()
  const [editId, setEditId] = useState<number | null>(null)
  const [species, setSpecies] = useState('cat')
  const [breeds, setBreeds] = useState<PetBreed[]>([])
  const [breedId, setBreedId] = useState<number | null>(null)
  const [nickname, setNickname] = useState('')
  const [ageMonths, setAgeMonths] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pageTitle, setPageTitle] = useState('添加宠物')

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params
    if (params?.id) {
      const id = parseInt(params.id, 10)
      setEditId(id)
      setPageTitle('编辑宠物')
      loadPet(id)
    }
  }, [])

  useEffect(() => {
    fetchBreeds()
  }, [species])

  const loadPet = async (id: number) => {
    try {
      const res = await getMyPets()
      const pet = res.pets?.find((p: Pet) => p.id === id)
      if (pet) {
        setSpecies(pet.species)
        setBreedId(pet.breed?.id ?? null)
        setNickname(pet.nickname || '')
        setAgeMonths(pet.age_months?.toString() || '')
        setWeightKg(pet.weight_kg?.toString() || '')
        setNotes(pet.notes || '')
      }
    } catch (error) {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    }
  }

  const fetchBreeds = async () => {
    try {
      const res = await getBreeds(species)
      setBreeds(res.breeds || [])
    } catch (error) {
      setBreeds([])
    }
  }

  const handleSubmit = async () => {
    if (submitting) return

    const data = {
      species,
      breed_id: breedId,
      nickname: nickname || undefined,
      age_months: ageMonths ? parseInt(ageMonths, 10) : undefined,
      weight_kg: weightKg ? parseFloat(weightKg) : undefined,
      notes: notes || undefined,
    }

    setSubmitting(true)
    try {
      if (editId) {
        await updatePet(editId, data)
        Taro.showToast({ title: '更新成功', icon: 'success' })
      } else {
        await createPet(data)
        Taro.showToast({ title: '添加成功', icon: 'success' })
      }
      setTimeout(() => {
        Taro.navigateBack()
      }, 1000)
    } catch (error: any) {
      Taro.showToast({ title: error.message || '操作失败', icon: 'none' })
    } finally {
      setSubmitting(false)
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
        <Text className="flex-1 text-sm font-bold text-gray-800">{pageTitle}</Text>
      </View>

      <View className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <View className="bg-white rounded-xl p-4">
          <Text className="text-xs text-gray-400 mb-3">选择种类</Text>
          <View className="flex flex-wrap gap-2">
            {SPECIES_OPTIONS.map((opt) => (
              <View
                key={opt.value}
                onClick={() => setSpecies(opt.value)}
                className={`px-4 py-2 rounded-full flex items-center gap-1.5 ${
                  species === opt.value
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Text>{opt.icon}</Text>
                <Text className="text-sm">{opt.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {breeds.length > 0 && (
          <View className="bg-white rounded-xl p-4">
            <Text className="text-xs text-gray-400 mb-3">选择品种</Text>
            <View className="flex flex-wrap gap-2">
              {breeds.map((b) => (
                <View
                  key={b.id}
                  onClick={() => setBreedId(breedId === b.id ? null : b.id)}
                  className={`px-4 py-2 rounded-full ${
                    breedId === b.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Text className="text-sm">{b.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="bg-white rounded-xl p-4 space-y-3">
          <Text className="text-xs text-gray-400 mb-3">基本信息（可选）</Text>
          <View className="flex items-center gap-3">
            <Text className="text-sm text-gray-600 w-16 shrink-0">昵称</Text>
            <View className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
              <input
                className="text-sm text-gray-800 w-full bg-transparent outline-none"
                type="text"
                placeholder="给宠物起个名字"
                value={nickname}
                onInput={(e: any) => setNickname(e.target.value)}
                maxLength={32}
              />
            </View>
          </View>
          <View className="flex items-center gap-3">
            <Text className="text-sm text-gray-600 w-16 shrink-0">年龄</Text>
            <View className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
              <input
                className="text-sm text-gray-800 w-full bg-transparent outline-none"
                type="number"
                placeholder="月龄"
                value={ageMonths}
                onInput={(e: any) => setAgeMonths(e.target.value)}
              />
            </View>
            <Text className="text-xs text-gray-400">个月</Text>
          </View>
          <View className="flex items-center gap-3">
            <Text className="text-sm text-gray-600 w-16 shrink-0">体重</Text>
            <View className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
              <input
                className="text-sm text-gray-800 w-full bg-transparent outline-none"
                type="number"
                step="0.1"
                placeholder="体重"
                value={weightKg}
                onInput={(e: any) => setWeightKg(e.target.value)}
              />
            </View>
            <Text className="text-xs text-gray-400">kg</Text>
          </View>
          <View className="flex gap-3">
            <Text className="text-sm text-gray-600 w-16 shrink-0 pt-2">备注</Text>
            <View className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
              <textarea
                className="text-sm text-gray-800 w-full bg-transparent outline-none min-h-[60px]"
                placeholder="记录一些关于宠物的信息..."
                value={notes}
                onInput={(e: any) => setNotes(e.target.value)}
                maxLength={500}
              />
            </View>
          </View>
        </View>
      </View>

      <View className="shrink-0 px-4 py-3 bg-white border-t border-gray-100">
        <View
          className={`w-full py-3 rounded-full text-center ${
            submitting
              ? 'bg-gray-300 text-white'
              : 'bg-orange-500 text-white'
          }`}
          onClick={handleSubmit}
        >
          <Text className="text-sm font-medium">
            {submitting ? '提交中...' : editId ? '保存修改' : '添加宠物'}
          </Text>
        </View>
      </View>
    </View>
  )
}
