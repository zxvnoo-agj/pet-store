import { X, ExternalLink, ShoppingCart, BarChart3, CheckCircle2 } from 'lucide-react'

interface Listing {
  id: number
  platform: string
  shop_name: string
  title: string
  price: number
  original_price?: number
  url: string
  image_url?: string
  sales_count?: number
  match_status: string
}

interface ListingDetailModalProps {
  listing: Listing
  onClose: () => void
}

export default function ListingDetailModal({ listing, onClose }: ListingDetailModalProps) {
  const matchStatusLabel: Record<string, string> = {
    linked: '已关联',
    candidate: '候选',
    rejected: '已拒绝',
  }
  const matchStatusStyle: Record<string, string> = {
    linked: 'bg-emerald-50 text-emerald-600',
    candidate: 'bg-amber-50 text-amber-600',
    rejected: 'bg-red-50 text-red-500',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm py-10">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-peach/10">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-peach rounded-full" />
            <h2 className="font-serif-display text-lg font-bold text-deep-black">
              商品详情
            </h2>
            <span className="text-xs text-carbon/40 ml-1">#{listing.id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-carbon/40 hover:text-carbon hover:bg-peach/10 transition-all duration-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* Image */}
          <div className="bg-gradient-to-br from-rose-gray/30 to-peach/5 rounded-xl flex items-center justify-center h-56 overflow-hidden">
            {listing.image_url ? (
              <img
                src={listing.image_url}
                alt={listing.title}
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <ShoppingCart className="w-14 h-14 text-peach/40" />
            )}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-peach/20 to-transparent" />

          {/* Title & meta */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-deep-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-peach" />
              基本信息
            </h3>
            <p className="text-sm text-deep-black font-medium leading-relaxed">{listing.title}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 bg-peach/5 text-peach rounded-full">{listing.platform}</span>
              <span className="text-carbon/40">|</span>
              <span className="text-carbon/60">{listing.shop_name}</span>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-peach/20 to-transparent" />

          {/* Price */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-deep-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-peach" />
              价格
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-deep-black">¥{listing.price}</span>
              {listing.original_price && listing.original_price > listing.price && (
                <span className="text-sm text-carbon/40 line-through">¥{listing.original_price}</span>
              )}
            </div>
            {listing.sales_count != null && (
              <div className="flex items-center gap-1.5 text-sm text-carbon/60">
                <BarChart3 className="w-3.5 h-3.5" />
                已售 <span className="font-medium text-deep-black">{listing.sales_count.toLocaleString()}</span> 件
              </div>
            )}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-peach/20 to-transparent" />

          {/* Status */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-deep-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-peach" />
              匹配状态
            </h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full ${matchStatusStyle[listing.match_status] || 'bg-gray-100 text-gray-500'}`}>
                {matchStatusLabel[listing.match_status] || '未匹配'}
              </span>
              {listing.match_status === 'linked' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-peach/10">
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-pill bg-peach text-white text-sm font-medium hover:bg-peach/90 transition-all duration-300"
          >
            查看商品链接
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}
