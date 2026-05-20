import { Link } from 'react-router-dom'
import { Boxes, ExternalLink } from 'lucide-react'

interface SpuCardProps {
  spu: {
    id: number
    brand: string
    name: string
    model: string
    pet_type: string
    price_min?: number
    price_max?: number
    currency: string
    image_urls?: string[]
    status: string
    listing_count?: number
    category?: { name: string }
  }
}

export default function SpuCard({ spu }: SpuCardProps) {
  const priceDisplay = spu.price_min
    ? `¥${spu.price_min}${spu.price_max && spu.price_max !== spu.price_min ? ` - ¥${spu.price_max}` : ''}`
    : '暂无价格'

  return (
    <Link
      to={`/spus/${spu.id}`}
      className="glass-card p-5 hover:shadow-lg transition-all duration-300 group"
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-peach/10 to-peach/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {spu.image_urls && spu.image_urls[0] ? (
            <img
              src={spu.image_urls[0]}
              alt={spu.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Boxes className="w-7 h-7 text-peach/60" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-peach/10 text-peach">
              {spu.brand}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              spu.status === 'active'
                ? 'bg-emerald-50 text-emerald-600'
                : spu.status === 'draft'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {spu.status === 'active' ? '上架' : spu.status === 'draft' ? '草稿' : '下架'}
            </span>
          </div>

          <h3 className="text-sm font-semibold text-deep-black truncate group-hover:text-peach transition-colors">
            {spu.name}
          </h3>
          <p className="text-xs text-carbon/60 mt-0.5">{spu.model}</p>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-deep-black">{priceDisplay}</span>
              {spu.listing_count ? (
                <span className="text-xs text-carbon/50 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  {spu.listing_count} 个链接
                </span>
              ) : null}
            </div>
            {spu.category ? (
              <span className="text-xs text-carbon/50">{spu.category.name}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  )
}
