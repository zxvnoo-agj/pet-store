import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal, ChevronDown } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { products } from '../data/mockData';

type SortType = 'default' | 'price_asc' | 'price_desc' | 'rating_desc';

const ProductListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState<SortType>('default');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const petType = searchParams.get('petType') || '';
  const category = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (petType) {
      result = result.filter(p => p.petType === petType);
    }

    if (category) {
      result = result.filter(p => {
        const catNames: Record<string, string> = {
          '主粮': '主粮',
          '零食': '零食',
          '玩具': '玩具',
        };
        return catNames[category] && p.name.includes(category.replace('主粮', ''));
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.priceMin - b.priceMin);
        break;
      case 'price_desc':
        result.sort((a, b) => b.priceMax - a.priceMax);
        break;
      case 'rating_desc':
        result.sort((a, b) => b.ratings.overall - a.ratings.overall);
        break;
      default:
        break;
    }

    return result;
  }, [petType, category, searchQuery, sortBy]);

  const getPageTitle = () => {
    if (searchQuery) return `搜索: ${searchQuery}`;
    if (petType && category) return `${petType === 'cat' ? '猫咪' : '狗狗'}${category}`;
    if (petType) return petType === 'cat' ? '猫咪用品' : '狗狗用品';
    if (category) return category;
    return '全部商品';
  };

  const sortOptions: { key: SortType; label: string }[] = [
    { key: 'default', label: '综合排序' },
    { key: 'rating_desc', label: '评分最高' },
    { key: 'price_asc', label: '价格最低' },
    { key: 'price_desc', label: '价格最高' },
  ];

  return (
    <div className="min-h-screen w-full bg-gray-100 flex justify-center items-start md:py-8">
      <div className="w-full max-w-[430px] h-[100dvh] md:h-[850px] bg-gray-50 md:rounded-[40px] md:shadow-2xl md:border-[8px] md:border-gray-800 overflow-hidden relative flex flex-col">
        <div className="hidden md:block h-6 bg-gray-800 rounded-b-xl mx-auto w-32 z-10 shrink-0" />

        {/* 头部 */}
        <div className="shrink-0 bg-white px-4 py-2.5 flex items-center gap-3 border-b border-gray-100">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="flex-1 text-sm font-bold text-gray-800 truncate">{getPageTitle()}</h1>
          <button
            className="flex items-center gap-1 text-xs text-gray-500"
            onClick={() => setShowSortMenu(!showSortMenu)}
          >
            <SlidersHorizontal size={14} />
            <span>筛选</span>
            <ChevronDown size={12} />
          </button>
        </div>

        {/* 排序菜单 */}
        {showSortMenu && (
          <div className="shrink-0 bg-white border-b border-gray-100 px-4 py-2 flex gap-2">
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sortBy === opt.key
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
                onClick={() => {
                  setSortBy(opt.key);
                  setShowSortMenu(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* 结果数 */}
        <div className="shrink-0 px-4 py-2 bg-gray-50">
          <span className="text-xs text-gray-400">共 {filteredProducts.length} 件商品</span>
        </div>

        {/* 商品列表 */}
        <main className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <SlidersHorizontal size={40} strokeWidth={1.5} />
              <p className="text-sm mt-3">暂无相关商品</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductListPage;
