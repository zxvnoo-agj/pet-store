import { useState } from 'react'
import { ExternalLink, Unlink, ArrowUpDown, RefreshCw, Star, Trash2 } from 'lucide-react'
import ListingDetailModal from './ListingDetailModal'

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
  goods_sign?: string
  is_primary?: boolean
  last_sync_error?: string
  match_status: string
}

interface ListingTableProps {
  listings: Listing[]
  onUnlink?: (id: number) => void
  onRefresh?: (id: number) => void
  onSetPrimary?: (id: number) => void
  onDelete?: (id: number) => void
  showUnlink?: boolean
}

export default function ListingTable({ listings = [], onUnlink, onRefresh, onSetPrimary, onDelete, showUnlink = true }: ListingTableProps) {
  const [sortField, setSortField] = useState<keyof Listing>('price')
  const [sortAsc, setSortAsc] = useState(true)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)

  const handleSort = (field: keyof Listing) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const sortedListings = (listings || []).slice().sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    if (aVal == null) return 1
    if (bVal == null) return -1
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortAsc ? aVal - bVal : bVal - aVal
    }
    return sortAsc
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal))
  })

  return (
    <>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-peach/10">
                <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">平台</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">商品</th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider cursor-pointer hover:text-peach transition-colors"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-1">
                    价格
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">店铺</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">购买能力</th>
                {(showUnlink || onRefresh || onSetPrimary || onDelete) && <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">操作</th>}
              </tr>
            </thead>
            <tbody>
              {sortedListings.map((listing) => (
                <tr key={listing.id} className="border-b border-peach/5 hover:bg-white/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-1 bg-peach/5 text-peach rounded-full">
                      {listing.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedListing(listing)}
                      className="flex items-center gap-2 text-sm text-deep-black hover:text-peach transition-colors text-left w-full"
                    >
                      {listing.image_url && (
                        <img
                          src={listing.image_url}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <span className="truncate max-w-[200px]">{listing.title}</span>
                      {listing.is_primary && <Star className="w-3.5 h-3.5 flex-shrink-0 text-amber-400 fill-amber-400" />}
                      <ExternalLink className="w-3 h-3 flex-shrink-0 text-carbon/40" />
                    </button>
                    {listing.last_sync_error && (
                      <div className="text-xs text-red-500 mt-1 max-w-[260px] truncate">
                        刷新失败：{listing.last_sync_error}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-deep-black">
                      ¥{listing.price}
                    </div>
                    {listing.original_price && listing.original_price > listing.price && (
                      <div className="text-xs text-carbon/40 line-through">
                        ¥{listing.original_price}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-carbon">{listing.shop_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      listing.match_status === 'linked'
                        ? 'bg-emerald-50 text-emerald-600'
                        : listing.match_status === 'candidate'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {listing.match_status === 'linked' ? '已关联' : listing.match_status === 'candidate' ? '候选' : listing.match_status === 'rejected' ? '已拒绝' : '未匹配'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {listing.goods_sign ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">可转链</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">仅展示</span>
                    )}
                  </td>
                  {(showUnlink || onRefresh || onSetPrimary || onDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {onSetPrimary && (
                          <button
                            onClick={() => onSetPrimary(listing.id)}
                            className="p-1.5 rounded-lg text-carbon/40 hover:text-amber-500 hover:bg-amber-50 transition-all"
                            title="设为主推"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        {onRefresh && (
                          <button
                            onClick={() => onRefresh(listing.id)}
                            disabled={!listing.goods_sign}
                            className="p-1.5 rounded-lg text-carbon/40 hover:text-peach hover:bg-peach/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title={listing.goods_sign ? '低频刷新价格' : '缺少 goods_sign，无法刷新'}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {showUnlink && (
                          <button
                            onClick={() => onUnlink?.(listing.id)}
                            className="p-1.5 rounded-lg text-carbon/40 hover:text-red-500 hover:bg-red-50 transition-all"
                            title="取消关联"
                          >
                            <Unlink className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(listing.id)}
                            className="p-1.5 rounded-lg text-carbon/40 hover:text-red-500 hover:bg-red-50 transition-all"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {listings.length === 0 && (
          <div className="text-center py-8 text-carbon/40">
            <ExternalLink className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">暂无链接数据</p>
          </div>
        )}
      </div>

      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </>
  )
}
