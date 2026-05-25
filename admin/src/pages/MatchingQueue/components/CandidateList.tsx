import { useState } from 'react'
import { Check, X, Eye } from 'lucide-react'
import { useSpuStore } from '../../../stores/spuStore'
import ListingDetailModal from '../../Spus/components/ListingDetailModal'

interface CandidateListProps {
  onConfirm: (listingIds: number[]) => void
  onReject: (listingIds: number[]) => void
}

export default function CandidateList({ onConfirm, onReject }: CandidateListProps) {
  const queueListings = useSpuStore((s) => s.queueListings)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [detailListing, setDetailListing] = useState<typeof queueListings[0] | null>(null)

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleAll = () => {
    if (selectedIds.size === queueListings.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(queueListings.map((l) => l.id)))
    }
  }

  return (
    <div className="glass-card overflow-hidden">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-6 py-3 border-b border-peach/10 bg-peach/5">
          <span className="text-sm text-carbon/70">已选 {selectedIds.size} 项</span>
          <button
            onClick={() => onConfirm(Array.from(selectedIds))}
            className="px-4 py-1.5 bg-emerald-500 text-white rounded-pill text-xs font-medium hover:bg-emerald-600 transition-colors flex items-center gap-1"
          >
            <Check className="w-3 h-3" /> 批量确认
          </button>
          <button
            onClick={() => onReject(Array.from(selectedIds))}
            className="px-4 py-1.5 bg-red-400 text-white rounded-pill text-xs font-medium hover:bg-red-500 transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" /> 批量拒绝
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-peach/10">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={queueListings.length > 0 && selectedIds.size === queueListings.length}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-peach/30 text-peach focus:ring-peach/20"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">商品</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">平台 / 店铺</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">价格</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">置信度</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">目标 SPU</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-carbon/60 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody>
            {queueListings.map((listing) => (
              <tr
                key={listing.id}
                className="border-b border-peach/5 hover:bg-white/30 transition-colors cursor-pointer"
                onClick={(e) => {
                  // Prevent modal when clicking checkbox or action buttons
                  if ((e.target as HTMLElement).closest('input, button')) return
                  setDetailListing(listing)
                }}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(listing.id)}
                    onChange={() => toggleSelect(listing.id)}
                    className="w-4 h-4 rounded border-peach/30 text-peach focus:ring-peach/20"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {listing.image_url && (
                      <img src={listing.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <span className="text-sm text-deep-black font-medium truncate max-w-[240px]">
                      {listing.title}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 bg-peach/5 text-peach rounded-full">
                    {listing.platform}
                  </span>
                  <p className="text-xs text-carbon/50 mt-0.5">{listing.shop_name}</p>
                </td>
                <td className="px-4 py-3 text-sm text-deep-black font-medium">¥{listing.price}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    (listing.match_confidence ?? 0) >= 0.85
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}>
                    {((listing.match_confidence ?? 0) * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-carbon">
                  {listing.spu_name ? (
                    <span className="text-peach">{listing.spu_name}</span>
                  ) : (
                    <span className="text-carbon/40">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setDetailListing(listing)}
                      className="p-1.5 rounded-lg text-carbon/40 hover:text-peach hover:bg-peach/10 transition-colors"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onConfirm([listing.id])}
                      className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors"
                      title="确认"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onReject([listing.id])}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                      title="拒绝"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailListing && (
        <ListingDetailModal
          listing={detailListing}
          onClose={() => setDetailListing(null)}
        />
      )}
    </div>
  )
}
