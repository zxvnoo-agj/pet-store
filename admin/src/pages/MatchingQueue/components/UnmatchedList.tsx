import { useState } from 'react'
import { ExternalLink, Link, Eye } from 'lucide-react'
import { useSpuStore } from '../../../stores/spuStore'
import { spuApi } from '../../../services/spuApi'
import ListingDetailModal from '../../Spus/components/ListingDetailModal'

export default function UnmatchedList() {
  const queueListings = useSpuStore((s) => s.queueListings)
  const fetchMatchingQueue = useSpuStore((s) => s.fetchMatchingQueue)
  const [spuInputs, setSpuInputs] = useState<Record<number, string>>({})
  const [linking, setLinking] = useState<Record<number, boolean>>({})
  const [detailListing, setDetailListing] = useState<typeof queueListings[0] | null>(null)

  const handleLink = async (listingId: number) => {
    const spuId = parseInt(spuInputs[listingId])
    if (!spuId) return
    setLinking((prev) => ({ ...prev, [listingId]: true }))
    try {
      await spuApi.linkListing(listingId, { spu_id: spuId })
      fetchMatchingQueue({ tier: 'unmatched', page: 1, page_size: 20 })
    } catch (e) {
      console.error('Link failed', e)
    } finally {
      setLinking((prev) => ({ ...prev, [listingId]: false }))
    }
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-peach/10">
              <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">商品</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">平台 / 店铺</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">价格</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">关联 SPU</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-carbon/60 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody>
            {queueListings.map((listing) => (
              <tr
                key={listing.id}
                className="border-b border-peach/5 hover:bg-white/30 transition-colors cursor-pointer"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('input, button, a')) return
                  setDetailListing(listing)
                }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {listing.image_url && (
                      <img src={listing.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <div>
                      <span className="text-sm text-deep-black font-medium truncate max-w-[240px] block">
                        {listing.title}
                      </span>
                      {listing.url && (
                        <a
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-peach hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <ExternalLink className="w-3 h-3" /> 查看链接
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 bg-peach/5 text-peach rounded-full">
                    {listing.platform}
                  </span>
                  <p className="text-xs text-carbon/50 mt-0.5">{listing.shop_name}</p>
                </td>
                <td className="px-4 py-3 text-sm text-deep-black font-medium">¥{listing.price}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="输入 SPU ID"
                      value={spuInputs[listing.id] || ''}
                      onChange={(e) =>
                        setSpuInputs((prev) => ({ ...prev, [listing.id]: e.target.value }))
                      }
                      className="w-24 px-3 py-1.5 bg-white/50 border border-peach/10 rounded-pill text-sm text-deep-black placeholder:text-carbon/40 focus:outline-none focus:border-peach/40"
                    />
                    <button
                      onClick={() => handleLink(listing.id)}
                      disabled={!spuInputs[listing.id] || linking[listing.id]}
                      className="p-1.5 rounded-lg text-peach hover:bg-peach/10 transition-colors disabled:opacity-40"
                      title="关联"
                    >
                      {linking[listing.id] ? (
                        <span className="inline-block w-4 h-4 border-2 border-peach border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Link className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setDetailListing(listing)}
                    className="p-1.5 rounded-lg text-carbon/40 hover:text-peach hover:bg-peach/10 transition-colors"
                    title="查看详情"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
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
