import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { AiAssistantIcon } from '../components/Icons';
import MobileLayout from '../components/MobileLayout';
import ProductCard from '../components/ProductCard';
import { products } from '../data/mockData';

// 模拟当前用户绑定的宠物（实际应从用户数据获取）
const myPets = [
  { id: 'mimi', name: '咪咪', type: 'cat', breed: '英短', icon: '🐱', color: '#FF8C42' },
];

// 如果用户没有绑定宠物，用这个兜底
const defaultPetChoices = [
  { id: 'cat', name: '猫咪', icon: '🐱', color: '#FF8C42' },
  { id: 'dog', name: '狗狗', icon: '🐶', color: '#4ECDC4' },
  { id: 'bird', name: '鸟类', icon: '🐦', color: '#45B7D1' },
  { id: 'fish', name: '水族', icon: '🐟', color: '#2196F3' },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [activePetId, setActivePetId] = useState(myPets[0]?.id || 'cat');

  // 根据选中的宠物获取推荐商品
  const activeBoundPet = myPets.find(p => p.id === activePetId);
  const activeDefaultPet = defaultPetChoices.find(p => p.id === activePetId);
  // 绑定的宠物用 type 字段，默认选项用 id 字段（本身就是 petType）
  const petTypeKey = activeBoundPet?.type || activeDefaultPet?.id || 'cat';
  const recommendedProducts = products
    .filter(p => p.petType === petTypeKey)
    .slice(0, 3);

  // 构建展示列表：绑定宠物在前，然后是默认选项，最后是"其他"
  const getPetDisplayList = () => {
    const list: Array<{ id: string; name: string; icon: string; subtitle?: string; isMine?: boolean }> = [];

    // 1. 已绑定的宠物
    myPets.forEach(pet => {
      list.push({
        id: pet.id,
        name: pet.name,
        icon: pet.icon,
        subtitle: pet.breed,
        isMine: true,
      });
    });

    // 2. 如果绑定的是猫，狗狗也展示出来（常见组合）；否则展示所有默认类型
    const boundTypes = new Set(myPets.map(p => p.type));
    defaultPetChoices.forEach(p => {
      if (!boundTypes.has(p.id)) {
        list.push({
          id: p.id,
          name: p.name,
          icon: p.icon,
          subtitle: '去看看',
          isMine: false,
        });
      }
    });

    // 3. 最后是"其他"
    list.push({ id: 'other', name: '其他', icon: '•••', subtitle: '' });

    return list;
  };

  const petDisplayList = getPetDisplayList();

  const handlePetClick = (petId: string) => {
    if (petId === 'other') {
      // 展开更多宠物选择
      return;
    }
    setActivePetId(petId);
  };

  return (
    <MobileLayout activeTab="home" className="bg-gray-50">
      {/* 顶部欢迎区 —— 简洁轻盈 */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400">下午好 👋</p>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5 leading-snug">
              今天想给<br />
              <span className="text-orange-500">{myPets[0]?.name || '毛孩子'}</span> 看点什么？
            </h1>
          </div>
          <button
            onClick={() => navigate('/search')}
            className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center"
          >
            <Icon name="search" size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* 我的宠物 —— 绑定宠物优先，最后有"其他" */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-1">
          {petDisplayList.map((pet) => {
            const isActive = activePetId === pet.id;
            const isOther = pet.id === 'other';

            return (
              <button
                key={pet.id}
                onClick={() => handlePetClick(pet.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all shrink-0 ${
                  isOther
                    ? 'border-dashed border-gray-200 bg-white text-gray-400'
                    : isActive
                    ? 'bg-orange-500 border-orange-500 text-white shadow-sm shadow-orange-200'
                    : 'bg-white border-gray-100 text-gray-700'
                }`}
              >
                <span className="text-lg">{isOther ? '•••' : pet.icon}</span>
                <div className="text-left">
                  <p className={`text-sm font-medium leading-none ${isOther ? 'text-gray-400' : ''}`}>
                    {pet.name}
                  </p>
                  {pet.subtitle && (
                    <p className={`text-[10px] mt-0.5 leading-none ${
                      isActive ? 'text-orange-100' : 'text-gray-400'
                    }`}>
                      {pet.isMine ? '我的' + pet.subtitle : pet.subtitle}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI助手卡片 —— 核心入口，突出展示 */}
      <div className="px-5 pt-5 pb-2">
        <button
          onClick={() => navigate('/chat')}
          className="w-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-2xl p-4 text-left relative overflow-hidden active:scale-[0.98] transition-transform"
        >
          {/* 装饰圆 */}
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
          <div className="absolute right-8 bottom-[-10px] w-12 h-12 bg-white/5 rounded-full" />

          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <AiAssistantIcon size={20} color="white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">问问 AI 助手</p>
              <p className="text-[11px] text-orange-100 mt-0.5">
                不知道选什么？直接问我
              </p>
            </div>
            <Icon name="messageCircle" size={20} className="text-white/70" />
          </div>
        </button>
      </div>

      {/* 轻量功能入口 */}
      <div className="px-5 pt-5 pb-2">
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/products?petType=${petTypeKey}`)}
            className="flex-1 bg-white rounded-2xl p-4 text-left border border-gray-100 active:scale-[0.97] transition-transform"
          >
            <Icon name="bookOpen" size={18} className="text-orange-400 mb-2" />
            <p className="text-sm font-medium text-gray-800">产品库</p>
            <p className="text-[10px] text-gray-400 mt-0.5">看看大家的选择</p>
          </button>
          <button
            onClick={() => navigate('/category')}
            className="flex-1 bg-white rounded-2xl p-4 text-left border border-gray-100 active:scale-[0.97] transition-transform"
          >
            <Icon name="search" size={18} className="text-teal-400 mb-2" />
            <p className="text-sm font-medium text-gray-800">分类 browse</p>
            <p className="text-[10px] text-gray-400 mt-0.5">按品类慢慢逛</p>
          </button>
        </div>
      </div>

      {/* 为你推荐 —— 轻量展示，不是"热门推荐" */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-800">
            给 <span className="font-medium text-orange-500">{activeBoundPet?.name || activeDefaultPet?.name || '猫咪'}</span> 的推荐
          </p>
          <button
            onClick={() => navigate(`/products?petType=${petTypeKey}`)}
            className="flex items-center gap-0.5 text-[11px] text-gray-400"
          >
            更多 <Icon name="chevronRight" size={12} />
          </button>
        </div>
        <div className="space-y-3">
          {recommendedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="px-5 pb-8 text-center">
        <p className="text-[10px] text-gray-300">
          产品信息来自真实用户评价，仅供参考
        </p>
      </div>
    </MobileLayout>
  );
};

export default HomePage;
