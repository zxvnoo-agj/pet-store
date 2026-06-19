import { Star, MessageCircle } from 'lucide-react';
import type { Spu } from '../types';
import Taro from '@tarojs/taro';
import { useCompareStore } from '../stores/compareStore';

interface ProductCardProps {
  product: Spu;
  variant?: 'horizontal' | 'vertical';
  showCompare?: boolean;
}

const getPetLabel = (petType?: string) => {
  if (petType === 'cat') return '猫用';
  if (petType === 'dog') return '犬用';
  return '宠物用品';
};

const getProductMeta = (product: Spu) => {
  const petLabel = getPetLabel(product.pet_type);
  if (product.category?.name) return `${petLabel} · ${product.category.name}`;

  const ingredient = product.ingredients?.find((item) => item && item.length <= 8);
  if (ingredient) return `${petLabel} · ${ingredient}`;

  return petLabel;
};

export default function ProductCard({ product, variant = 'horizontal', showCompare = true }: ProductCardProps) {
  const { addToCompare, isInCompare } = useCompareStore();
  const inCompare = isInCompare(product.id);
  const productMeta = getProductMeta(product);

  const navigateToDetail = () => {
    Taro.navigateTo({ url: `/pages/product/detail?id=${product.id}` });
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCompare(product.id);
  };

  if (variant === 'vertical') {
    return (
      <div
        className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
        onClick={navigateToDetail}
      >
        <div className="aspect-square overflow-hidden bg-gray-100">
          <img
            src={product.image_urls?.[0] || ''}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="p-2.5">
          <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{product.brand}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <Star size={12} className="text-orange-400 fill-orange-400" />
            <span className="text-xs font-medium text-orange-500">{product.rating || '-'}</span>
            <span className="text-[10px] text-gray-400">({product.review_count ?? 0})</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <span className="text-xs text-gray-500 truncate flex-1 min-w-0">
              {productMeta}
            </span>
            {showCompare && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] cursor-pointer ${
                  inCompare
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-gray-100 text-gray-500'
                }`}
                onClick={handleCompare}
              >
                {inCompare ? '已对比' : '对比'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex gap-3 active:bg-gray-50 transition-colors"
      onClick={navigateToDetail}
    >
      <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0">
        <img
          src={product.image_urls?.[0] || ''}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 leading-tight">{product.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{product.brand}</p>
        <p className="text-xs text-gray-500 mt-1.5 truncate">{productMeta}</p>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              <Star size={12} className="text-orange-400 fill-orange-400" />
              <span className="text-xs font-medium text-orange-500">{product.rating || '-'}</span>
            </div>
            <div className="flex items-center gap-0.5 text-gray-400">
              <MessageCircle size={11} />
              <span className="text-[10px]">{product.review_count ?? 0}</span>
            </div>
          </div>
          {showCompare && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] cursor-pointer ${
                inCompare
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-gray-100 text-gray-500'
              }`}
              onClick={handleCompare}
            >
              {inCompare ? '已对比' : '对比'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
