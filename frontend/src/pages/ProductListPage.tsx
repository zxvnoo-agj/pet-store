import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal, ChevronDown, Loader2 } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useSpuStore } from '../stores/spuStore';

type SortType = 'default' | 'price_asc' | 'price_desc' | 'rating';

export default function ProductListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState<SortType>('default');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const spus = useSpuStore((s) => s.spus);
  const loading = useSpuStore((s) => s.loading);
  const fetchSpus = useSpuStore((s) => s.fetchSpus);

  const categoryId = searchParams.get('category_id') || '';
  const brand = searchParams.get('brand') || '';
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    const filters: any = {};
    if (categoryId) filters.category_id = Number(categoryId);
    if (brand) filters.brand = brand;
    if (searchQuery) filters.search = searchQuery;
    if (sortBy !== 'default') filters.sort = sortBy;
    fetchSpus(filters);
  }, [categoryId, brand, searchQuery, sortBy]);

  const getPageTitle = () => {
    if (searchQuery) return `搜索: ${searchQuery}`;
    if (brand) return brand;
    if (categoryId) return '商品列表';
    return '全部商品';
  };

  const sortOptions: { key: SortType; label: string }[] = [
    { key: 'default', label: '综合排序' },
    { key: 'rating', label: '评分最高' },
    { key: 'price_asc', label: '价格最低' },
    { key: 'price_desc', label: '价格最高' },
  ];

  return (
    <div className="min-h-screen w-full bg-gray-100 flex justify-center items-start md:py-8">
      <div className="w-full max-w-[430px] h-[100dvh] md:h-[850px] bg-gray-50 md:rounded-[40px] md:shadow-2xl md:border-[8px] md:border-gray-800 overflow-hidden relative flex flex-col">
        <div className="hidden md:block h-6 bg-gray-800 rounded-b-xl mx-auto w-32 z-10 shrink-0" />

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
            <span>排序</span>
            <ChevronDown size={12} />
          </button>
        </div>

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

        <div className="shrink-0 px-4 py-2 bg-gray-50">
          <span className="text-xs text-gray-400">
            {loading ? '加载中...' : `共 ${spus.length} 件商品`}
          </span>
        </div>

        <main className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {spus.map((spu) => (
                <ProductCard key={spu.id} product={spu as any} />
              ))}
            </div>
          )}

          {!loading && spus.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <SlidersHorizontal size={40} strokeWidth={1.5} />
              <p className="text-sm mt-3">暂无相关商品</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
