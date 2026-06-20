import React, { useState } from 'react'
import { View, Text, Textarea, Switch } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { submitReview } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

export default function ReviewCreatePage() {
  const router = useRouter()
  const spuId = Number(router.params.spuId || router.params.id)
  const spuName = router.params.name ? decodeURIComponent(router.params.name) : '商品'
  const { isLoggedIn } = useAuthStore()
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [isRecommended, setIsRecommended] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    const text = content.trim()
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (!text) {
      Taro.showToast({ title: '请填写评价内容', icon: 'none' })
      return
    }
    if (text.length > 500) {
      Taro.showToast({ title: '评价不能超过500字', icon: 'none' })
      return
    }
    if (!spuId) {
      Taro.showToast({ title: '商品信息异常', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      const res = await submitReview(spuId, {
        rating,
        content: text,
        is_recommended: isRecommended,
      })
      Taro.showToast({ title: res.message || '已提交审核', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 700)
    } catch (error: any) {
      Taro.showToast({ title: error.message || '提交失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="min-h-screen mini-page px-4 py-4">
      <View className="mini-surface rounded-3xl p-4 border mini-border mini-card-soft">
        <Text className="text-xs text-gray-400">给 {spuName} 写评价</Text>
        <Text className="block mt-2 text-lg font-bold text-gray-900">分享真实使用体验</Text>

        <View className="flex items-center gap-2 mt-5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Text
              key={star}
              className={`text-3xl ${star <= rating ? 'text-orange-500' : 'text-gray-200'}`}
              onClick={() => setRating(star)}
            >
              ★
            </Text>
          ))}
          <Text className="text-sm text-gray-500 ml-2">{rating} 分</Text>
        </View>

        <View className="mt-5 bg-[#FAFAF8] rounded-2xl p-3 border mini-border">
          <Textarea
            value={content}
            maxlength={500}
            autoHeight
            placeholder="比如适口性、便便状态、价格感受、踩坑点..."
            className="w-full min-h-[160px] text-sm text-gray-800"
            onInput={(e) => setContent(e.detail.value)}
          />
          <Text className={`block text-right text-xs ${content.length > 500 ? 'text-red-500' : 'text-gray-400'}`}>
            {content.length}/500
          </Text>
        </View>

        <View className="flex items-center justify-between mt-5 py-3 border-t border-gray-100">
          <View>
            <Text className="block text-sm font-medium text-gray-800">愿意推荐</Text>
            <Text className="block text-xs text-gray-400 mt-1">会作为推荐率统计的一部分</Text>
          </View>
          <Switch
            checked={isRecommended}
            color="#f97316"
            onChange={(e) => setIsRecommended(e.detail.value)}
          />
        </View>

        <View
          className={`mt-5 py-3 rounded-full text-center ${submitting ? 'bg-orange-300' : 'bg-orange-500'}`}
          onClick={submitting ? undefined : handleSubmit}
        >
          <Text className="text-white text-sm font-bold">{submitting ? '提交中...' : '提交审核'}</Text>
        </View>
      </View>
    </View>
  )
}
