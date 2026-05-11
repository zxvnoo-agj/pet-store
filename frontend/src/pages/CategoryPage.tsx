import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import MobileLayout from '../components/MobileLayout';
import { petTypes, categories } from '../data/mockData';

const CategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [activePet, setActivePet] = useState('cat');

  const filteredCategories = categories.filter(c => c.petType === activePet);

  return (
    <MobileLayout activeTab="category" className="bg-white">
      {/* 搜索栏 */}
      <div className="px-4 py-2.5 border-b border-gray-100">
        <div
          className="flex items-center gap-2 bg-gray-100 rounded-full px-3.5 py-2"
          onClick={() => navigate('/search')}
        >
          <Search size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400">搜索猫粮、狗粮、用品...</span>
        </div>
      </div>

      {/* 分类布局：左侧宠物类型 + 右侧品类 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：宠物类型 */}
        <div className="w-20 bg-gray-50 flex flex-col items-center py-3 gap-1 shrink-0 overflow-y-auto">
          {petTypes.map((pet) => (
            <button
              key={pet.id}
              onClick={() => setActivePet(pet.id)}
              className={`flex flex-col items-center gap-1 py-3 px-1 w-full rounded-r-xl transition-all relative ${
                activePet === pet.id
                  ? 'bg-white text-orange-500 font-medium'
                  : 'text-gray-500'
              }`}
            >
              <span className="text-xl">{pet.icon}</span>
              <span className="text-[11px]">{pet.name}</span>
              {activePet === pet.id && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-orange-500 rounded-r" />
              )}
            </button>
          ))}
        </div>

        {/* 右侧：品类列表 */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="mb-4">
            <h2 className="text-base font-bold text-gray-800">
              {petTypes.find(p => p.id === activePet)?.name}用品
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">共 {filteredCategories.length} 个分类</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                className="flex flex-col items-center gap-2 py-4 bg-gray-50 rounded-xl active:bg-orange-50 active:scale-95 transition-all"
                onClick={() => navigate(`/products?petType=${activePet}&category=${cat.name}`)}
              >
                <span className="text-3xl">{cat.icon}</span>
                <span className="text-xs text-gray-700 font-medium">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* 品牌推荐 */}
          <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-800 mb-3">热门品牌</h3>
            <div className="flex flex-wrap gap-2">
              {['皇家', '渴望', '爱肯拿', '巅峰', '网易严选', '素力高', 'Now Fresh', 'K9'].map((brand) => (
                <span
                  key={brand}
                  className="px-3 py-1.5 bg-orange-50 text-orange-600 text-xs rounded-full font-medium"
                  onClick={() => navigate(`/products?brand=${brand}`)}
                >
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default CategoryPage;
