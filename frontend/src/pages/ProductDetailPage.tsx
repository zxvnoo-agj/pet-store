import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { webApi } from '../services/webApi';
import { FavoriteIcon, FavoriteFilledIcon, ShareIcon, AiAssistantIcon } from '../components/Icons';

interface SpuDetail {
  id: number
  brand: string
  name: string
  model: string
  pet_type: string
  description: string | null
  ingredients: string[]
  nutrition: Record<string, any>
  pros: string[]
  cons: string[]
  extra_attrs: Record<string, any>
  currency: string
  image_urls: string[]
  status: string
  category_id: number
  price_min: number | null
  price_max: number | null
  category: { id: number; name: string; pet_type: string } | null
  listing_count: number
  is_favorited: boolean
}

interface ReviewItem {
  id: number
  rating: number
  content: string
  tags: string[]
  is_recommended: boolean
  user: { nickname: string; avatar: string | null } | null
  helpful_count: number
  created_at: string
}

interface ReviewsResponse {
  items: ReviewItem[]
  summary: {
    average_rating: number
    rating_distribution: Record<string, number>
    top_tags: string[]
    recommend_rate: number
  }
  pagination: { page: number; page_size: number; total: number; total_pages: number }
}

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [spu, setSpu] = useState<SpuDetail | null>(null)
  const [reviewsData, setReviewsData] = useState<ReviewsResponse | null>(null)
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeTab, setActiveTab] = useState<'pros_cons' | 'reviews'>('pros_cons');
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return
    Promise.all([
      webApi.get<SpuDetail>(`/spus/${id}`),
      webApi.get<ReviewsResponse>(`/spus/${id}/reviews`).catch(() => null),
    ]).then(([spuData, reviews]) => {
      setSpu(spuData)
      setIsFavorited(spuData.is_favorited)
      setReviewsData(reviews)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        加载中...
      </div>
    )
  }

  if (!spu) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        商品不存在
      </div>
    );
  }

  const reviews = reviewsData?.items || []
  const summary = reviewsData?.summary
  const recommendRate = Math.round((summary?.recommend_rate || 0) * 100)
  const displayRating = summary?.average_rating || 0
  const displayReviewCount = reviewsData?.pagination?.total || 0
  const reviewTags = summary?.top_tags?.length ? summary.top_tags : ['适口性好', '营养均衡', '性价比高', '便便正常', '毛色变亮']

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

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
            <Icon name="arrowLeft" size={18} color="white" />
          </button>
          <div className="flex gap-2">
            <button
              className="w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
              onClick={async () => {
                if (!id) return
                try {
                  const res = await webApi.post<{ is_favorited: boolean }>(`/spus/${id}/favorite`)
                  setIsFavorited(res.is_favorited)
                } catch {}
              }}
            >
              {isFavorited ? <FavoriteFilledIcon size={18} color="#f87171" /> : <FavoriteIcon size={18} color="white" />}
            </button>
            <button className="w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
              <ShareIcon size={18} color="white" />
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {/* 商品图片 */}
          <div className="aspect-square bg-gray-100">
            <img src={spu.image_urls?.[0] || ''} alt={spu.name} className="w-full h-full object-cover" />
          </div>

          {/* 基本信息 */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{spu.name}</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">{spu.brand}</p>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-orange-600">
                ¥{spu.price_min ?? '--'}
              </span>
              {spu.price_max != null && spu.price_min != null && spu.price_max > spu.price_min && (
                <>
                  <span className="text-gray-400">~</span>
                  <span className="text-lg text-orange-500">¥{spu.price_max}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <Icon name="star" size={16} color="#fb923c" fill="#fb923c" />
                <span className="text-sm font-bold text-gray-800">{displayRating}</span>
              </div>
              <span className="text-xs text-gray-400">{displayReviewCount}条评价</span>
              {reviews.length > 0 && (
                <span className="text-xs text-orange-500 font-medium">{recommendRate}%推荐</span>
              )}
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
              真实评价 ({displayReviewCount})
            </button>
          </div>

          {/* 优缺点内容 */}
          {activeTab === 'pros_cons' && (
            <div className="px-4 py-4 space-y-4">
              {spu.pros?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-green-700 flex items-center gap-1.5 mb-2">
                    <Icon name="check" size={16} color="#16a34a" /> 优点
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {spu.pros.map((pro, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-green-50 text-green-700 text-xs rounded-full font-medium"
                      >
                        {pro}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {spu.cons?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-red-600 flex items-center gap-1.5 mb-2">
                    <Icon name="x" size={16} color="#dc2626" /> 缺点
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {spu.cons.map((con, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-full font-medium"
                      >
                        {con}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 成分 */}
              {spu.ingredients?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2">成分</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {spu.ingredients.join('、')}
                  </p>
                </div>
              )}

              {/* 描述 */}
              {spu.description && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2">商品描述</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{spu.description}</p>
                </div>
              )}

              {/* 营养成分 */}
              {spu.nutrition && Object.keys(spu.nutrition).length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2">营养成分</h3>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    {Object.entries(spu.nutrition).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                        <span className="text-xs text-gray-600">{key}</span>
                        <span className="text-xs font-medium text-gray-800">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 额外属性 */}
              {spu.extra_attrs && Object.keys(spu.extra_attrs).length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-2">产品参数</h3>
                  <div className="space-y-2">
                    {Object.entries(spu.extra_attrs).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1.5 border-b border-gray-50">
                        <span className="text-xs text-gray-500">{key}</span>
                        <span className="text-xs text-gray-800 font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 评价内容 */}
          {activeTab === 'reviews' && (
            <div className="px-4 py-4 space-y-4">
              {/* 评价统计 */}
              {summary && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-gray-800">
                      {summary.average_rating}
                      <span className="text-sm text-gray-400 font-normal">/5</span>
                    </span>
                    <span className="text-xs text-orange-500 font-medium">
                      {recommendRate}% 的人推荐
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {reviewTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 评价列表 */}
              {displayedReviews.map((review) => (
                <div key={review.id} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">
                      {review.user?.nickname?.[0] || 'U'}
                    </div>
                    <span className="text-xs font-medium text-gray-700">{review.user?.nickname || '匿名用户'}</span>
                    <div className="ml-auto flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Icon
                          key={i}
                          name="star"
                          size={10}
                          color={i < Math.round(review.rating) ? '#fb923c' : '#e5e7eb'}
                          fill={i < Math.round(review.rating) ? '#fb923c' : undefined}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{review.content}</p>
                  {review.tags?.length > 0 && (
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
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-400">{review.created_at}</span>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Icon name="thumbsUp" size={10} color="#6B7280" />
                      <span className="text-[10px]">{review.helpful_count || 0}</span>
                    </div>
                  </div>
                </div>
              ))}

              {!showAllReviews && reviews.length > 3 && (
                <button
                  className="w-full py-2.5 text-xs text-orange-500 font-medium border border-orange-200 rounded-xl"
                  onClick={() => setShowAllReviews(true)}
                >
                  查看全部 {reviews.length} 条评价
                </button>
              )}
            </div>
          )}
        </main>

        {/* 底部操作栏 */}
        <div className="shrink-0 px-4 py-2.5 bg-white border-t border-gray-100 flex items-center gap-3 z-10">
          <button
            className="flex flex-col items-center gap-0.5 px-2"
            onClick={() => navigate('/chat', { state: { spuId: spu.id } })}
          >
            <AiAssistantIcon size={20} color="#f97316" />
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
