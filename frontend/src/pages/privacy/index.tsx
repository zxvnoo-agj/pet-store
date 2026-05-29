import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'

export default function PrivacyPage() {
  const handleAgree = () => {
    Taro.setStorageSync('privacy_consented', 'true')
    Taro.navigateBack()
  }

  return (
    <View className="min-h-screen bg-white px-4 py-6">
      <ScrollView scrollY style={{ height: 'calc(100vh - 120px)' }}>
        <Text className="text-lg font-bold text-gray-900 mb-4 block">用户隐私协议</Text>
        <Text className="text-sm text-gray-600 leading-relaxed block mb-3">
          欢迎使用宠物用品助手（以下简称"本小程序"）。我们非常重视您的隐私保护，在您使用本小程序前，请仔细阅读以下协议。
        </Text>
        <Text className="text-sm text-gray-600 leading-relaxed block mb-3">
          1. 信息收集：当您使用本小程序时，我们可能会收集以下信息：
          - 微信昵称、头像等公开信息（用于用户登录和展示）
          - 您与AI助手的对话内容（用于提供智能问答服务）
          - 您的搜索和浏览记录（用于优化推荐）
        </Text>
        <Text className="text-sm text-gray-600 leading-relaxed block mb-3">
          2. 信息使用：我们收集的信息仅用于：
          - 提供和优化宠物用品推荐服务
          - 改善AI助手的回答质量
          - 为您提供个性化的商品推荐
        </Text>
        <Text className="text-sm text-gray-600 leading-relaxed block mb-3">
          3. 信息存储：您的对话记录将安全存储在服务器上，我们采取合理的安全措施保护您的数据。
        </Text>
        <Text className="text-sm text-gray-600 leading-relaxed block mb-3">
          4. 信息共享：我们不会将您的个人信息出售给第三方。在以下情况可能会共享信息：
          - 获得您的明确同意
          - 法律法规要求
          - 保护用户或公众的合法权益
        </Text>
        <Text className="text-sm text-gray-600 leading-relaxed block mb-3">
          5. 您的权利：您可以随时查看、修改或删除您的个人信息。如需帮助，请联系我们。
        </Text>
        <Text className="text-sm text-gray-600 leading-relaxed block mb-8">
          6. 协议更新：我们可能会不时更新本协议，更新后的协议将在小程序内公布。
        </Text>
      </ScrollView>
      <View className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <View
          className="w-full py-3 bg-orange-500 rounded-xl text-center"
          onClick={handleAgree}
        >
          <Text className="text-white font-medium text-base">同意并继续</Text>
        </View>
      </View>
    </View>
  )
}
