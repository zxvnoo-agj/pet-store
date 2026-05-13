import React from 'react';
import { Star, MessageCircle } from 'lucide-react';
import type { Product } from '../types';
import Taro from '@tarojs/taro';
import { useCompareStore } from '../stores/compareStore';

interface ProductCardProps {
  product: Product;
  variant?: 'horizontal' | 'vertical';
  showCompare?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, variant = 'horizontal', showCompare = true }) => {
  const { addToCompare, isInCompare } = useCompareStore();
  const inCompare = isInCompare(product.id);

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
            <span className="text-xs font-medium text-orange-500">{product.ratings.overall}</span>
            <span className="text-[10px] text-gray-400">({product.reviewCount})</span>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <span className="text-orange-600 font-bold text-sm">
              ¥{product.price_min}
              {product.price_max > product.price_min && <span className="text-xs">起</span>}
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
        
        {/* 优缺点标签 */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {product.pros.slice(0, 2).map((pro, i) => (
            <span key={`pro-${i}`} className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full">
              +{pro}
            </span>
          ))}
          {product.cons.slice(0, 1).map((con, i) => (
            <span key={`con-${i}`} className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded-full">
              -{con}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              <Star size={12} className="text-orange-400 fill-orange-400" />
              <span className="text-xs font-medium text-orange-500">{product.ratings.overall}</span>
            </div>
            <div className="flex items-center gap-0.5 text-gray-400">
              <MessageCircle size={11} />
              <span className="text-[10px]">{product.reviewCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-orange-600 font-bold text-sm">
              ¥{product.price_min}
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
    </div>
  );
};

export default ProductCard;
