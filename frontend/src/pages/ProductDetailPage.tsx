import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Heart, Share2, ThumbsUp, Check, X, Bot } from 'lucide-react';
import { products, reviews } from '../data/mockData';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeTab, setActiveTab] = useState<'pros_cons' | 'reviews'>('pros_cons');
  const [showAllReviews, setShowAllReviews] = useState(false);

  const product = useMemo(() => products.find(p => p.id === Number(id)), [id]);
  const productReviews = useMemo(
    () => reviews.filter(r => r.productId === Number(id)),
    [id]
  );

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        商品不存在
      </div>
    );
  }

  const recommendRate = Math.round(
    (productReviews.filter(r => r.isRecommended).length / (productReviews.length || 1)) * 100
  );

  const displayedReviews = showAllReviews ? productReviews : productReviews.slice(0, 3);

  return (
    <div className="min-h-screen w-full bg-gray-100 flex justify-center items-start md:py-8">
      <div className="w-full max-w-[430px] h-[100dvh] md:h-[850px] bg-white md:rounded-[40px] md:shadow-2xl md:border-[8px] md:border-gray-800 overflow-hidden relative flex flex-col">
        <div className="hidden md:block h-6 bg-gray-800 rounded-b-xl mx-auto w-32 z-10 shrink-0" />

        {/* 导航栏 */}
        <div className="shrink-0 absolute top-6 md:top-10 left-4 right-4 z-20 flex items-center justify-between">
          <button
            className="w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="flex gap-2">
            <button
              className="w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
              onClick={() => setIsFavorited(!isFavorited)}
            >
              <Heart size={18} className={isFavorited ? 'text-red-400 fill-red-400' : 'text-white'} />
            </button>
            <button className="w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Share2 size={18} className="text-white" />
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {/* 商品图片 */}
          <div className="aspect-square bg-gray-100">
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          </div>

          {/* 基本信息 */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{product.name}</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">{product.brand}</p>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-orange-600">
                ¥{product.priceMin}
              </span>
              {product.priceMax > product.priceMin && (
                <>
                  <span className="text-gray-400">~</span>
                  <span className="text-lg text-orange-500">¥{product.priceMax}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <Star size={16} className="text-orange-400 fill-orange-400" />
                <span className="text-sm font-bold text-gray-800">{product.ratings.overall}</span>
              </div>
              <span className="text-xs text-gray-400">{product.reviewCount}条评价</span>
              <span className="text-xs text-orange-500 font-medium">{recommendRate}%推荐</span>
            </div>
          </div>

          {/* Tab切换 */}
          <div className="flex border-b border-gray-100 px-4">
            <button
              className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === 'pros_cons'
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-500'
              }`}
              onClick={() => setActiveTab('pros_cons')}
            >
              优缺点
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-500'
              }`}
              onClick={() => setActiveTab('reviews')}
            >
              真实评价 ({product.reviewCount})
            </button>
          </div>

          {/* 优缺点内容 */}
          {activeTab === 'pros_cons' && (
            <div className="px-4 py-4 space-y-4">
              {/* 优点 */}
              <div>
                <h3 className="text-sm font-bold text-green-700 flex items-center gap-1.5 mb-2">
                  <Check size={16} /> 优点
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.pros.map((pro, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-green-50 text-green-700 text-xs rounded-full font-medium"
                    >
                      {pro}
                    </span>
                  ))}
                </div>
              </div>

              {/* 缺点 */}
              <div>
                <h3 className="text-sm font-bold text-red-600 flex items-center gap-1.5 mb-2">
                  <X size={16} /> 缺点
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.cons.map((con, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-full font-medium"
                    >
                      {con}
                    </span>
                  ))}
                </div>
              </div>

              {/* 评分详情 */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3">评分详情</h3>
                <div className="space-y-2.5">
                  {[
                    { label: '综合评分', value: product.ratings.overall },
                    { label: '性价比', value: product.ratings.costPerformance },
                    { label: '产品质量', value: product.ratings.quality },
                    { label: '适口性', value: product.ratings.taste },
                    { label: '包装', value: product.ratings.packaging },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-16">{item.label}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 rounded-full"
                          style={{ width: `${(item.value / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-8 text-right">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 成分 */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-2">成分</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {product.ingredients.join('、')}
                </p>
              </div>

              {/* 描述 */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-2">商品描述</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            </div>
          )}

          {/* 评价内容 */}
          {activeTab === 'reviews' && (
            <div className="px-4 py-4 space-y-4">
              {/* 评价统计 */}
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-800">
                    {product.ratings.overall}
                    <span className="text-sm text-gray-400 font-normal">/5</span>
                  </span>
                  <span className="text-xs text-orange-500 font-medium">
                    {recommendRate}% 的人推荐
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['适口性好', '营养均衡', '性价比高', '便便正常', '毛色变亮'].map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 评价列表 */}
              {displayedReviews.map((review) => (
                <div key={review.id} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">
                      {review.user.avatar}
                    </div>
                    <span className="text-xs font-medium text-gray-700">{review.user.nickname}</span>
                    <div className="ml-auto flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={10}
                          className={i < review.rating ? 'text-orange-400 fill-orange-400' : 'text-gray-200'}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{review.content}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {review.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-400">{review.createdAt}</span>
                    <div className="flex items-center gap-1 text-gray-400">
                      <ThumbsUp size={10} />
                      <span className="text-[10px]">{review.helpfulCount}</span>
                    </div>
                  </div>
                </div>
              ))}

              {!showAllReviews && productReviews.length > 3 && (
                <button
                  className="w-full py-2.5 text-xs text-orange-500 font-medium border border-orange-200 rounded-xl"
                  onClick={() => setShowAllReviews(true)}
                >
                  查看全部 {productReviews.length} 条评价
                </button>
              )}
            </div>
          )}
        </main>

        {/* 底部操作栏 */}
        <div className="shrink-0 px-4 py-2.5 bg-white border-t border-gray-100 flex items-center gap-3 z-10">
          <button
            className="flex flex-col items-center gap-0.5 px-2"
            onClick={() => navigate('/chat', { state: { productId: product.id } })}
          >
            <Bot size={20} className="text-orange-500" />
            <span className="text-[10px] text-gray-500">问AI</span>
          </button>
          <button className="flex-1 bg-orange-500 text-white text-sm font-medium py-2.5 rounded-full active:bg-orange-600 transition-colors">
            加入对比
          </button>
          <button className="flex-1 bg-gray-900 text-white text-sm font-medium py-2.5 rounded-full active:bg-gray-800 transition-colors">
            去购买
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
