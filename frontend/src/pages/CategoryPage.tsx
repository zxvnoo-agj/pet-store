import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import MobileLayout from '../components/MobileLayout';
import { webApi } from '../services/webApi';

interface CategoryItem {
  id: number
  name: string
  pet_type: string
  parent_id: number | null
  level: number
  children: CategoryItem[]
}

const petTypes = [
  { id: 'cat', name: '猫咪', icon: '🐱' },
  { id: 'dog', name: '狗狗', icon: '🐶' },
]

const categoryIcons: Record<string, string> = {
  '猫粮': '🍖',
  '狗粮': '🍖',
  '干粮': '🌾',
  '湿粮': '🥫',
}

export default function CategoryPage() {
  const navigate = useNavigate();
  const [activePet, setActivePet] = useState('cat');
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await webApi.get<{ categories: CategoryItem[] }>('/categories');
      setCategories(data.categories || []);
    } catch (e) {
      console.error('Failed to fetch categories', e);
    } finally {
      setLoading(false);
    }
  };

  const petTypeMap: Record<string, string> = {
    cat: '猫咪',
    dog: '狗狗',
  };

  const filteredCategories = categories.filter(c => c.pet_type === activePet);

  return (
    <MobileLayout activeTab="category" className="bg-white">
      <div className="px-4 py-2.5 border-b border-gray-100">
        <div
          className="flex items-center gap-2 bg-gray-100 rounded-full px-3.5 py-2"
          onClick={() => navigate('/search')}
        >
          <Icon name="search" size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400">搜索猫粮、狗粮、用品...</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
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

        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Icon name="loader2" className="w-5 h-5 animate-spin text-orange-500" />
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-base font-bold text-gray-800">
                  {petTypeMap[activePet] || '宠物'}用品
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">共 {filteredCategories.length} 个分类</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    className="flex flex-col items-center gap-2 py-4 bg-gray-50 rounded-xl active:bg-orange-50 active:scale-95 transition-all"
                    onClick={() => navigate(`/products?category_id=${cat.id}`)}
                  >
                    <span className="text-3xl">{categoryIcons[cat.name] || '📦'}</span>
                    <span className="text-xs text-gray-700 font-medium">{cat.name}</span>
                  </button>
                ))}
              </div>

              {filteredCategories.map((cat) => cat.children.length > 0 && (
                <div key={`sub-${cat.id}`} className="mt-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">{cat.name}分类</h3>
                  <div className="flex flex-wrap gap-2">
                    {cat.children.map((child) => (
                      <span
                        key={child.id}
                        className="px-3 py-1.5 bg-orange-50 text-orange-600 text-xs rounded-full font-medium"
                        onClick={() => navigate(`/products?category_id=${child.id}`)}
                      >
                        {child.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-6">
                <h3 className="text-sm font-bold text-gray-800 mb-3">热门品牌</h3>
                <div className="flex flex-wrap gap-2">
                  {['皇家(Royal Canin)', '渴望', '爱肯拿', '巅峰', '网易严选', '素力高', 'Now Fresh', 'K9'].map((brand) => (
                    <span
                      key={brand}
                      className="px-3 py-1.5 bg-orange-50 text-orange-600 text-xs rounded-full font-medium"
                      onClick={() => navigate(`/products?brand=${encodeURIComponent(brand)}`)}
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
