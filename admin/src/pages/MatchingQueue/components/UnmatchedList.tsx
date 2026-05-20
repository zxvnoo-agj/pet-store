import { useState } from 'react'
import { useSpuStore } from '../../../stores/spuStore'

interface UnmatchedListProps {
  onLinkToSpu: (listingId: number, spuId: number) => void
  onCreateSpu: (listing: any) => void
}

export default function UnmatchedList({ onLinkToSpu, onCreateSpu }: UnmatchedListProps) {
  const queueListings = useSpuStore((s: any) => s.queueListings)
  const queueLoading = useSpuStore((s: any) => s.queueLoading)
  const [selectedSpuId, setSelectedSpuId] = useState<Record<string, string>>({})

  if (queueLoading) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>
  }

  if (!queueListings?.length) {
    return <div className="p-8 text-center text-gray-500">暂无未匹配商品</div>
  }

  return (
    <div className="space-y-4">
      {queueListings.map((listing: any) => (
        <div key={listing.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                  未匹配
                </span>
                {listing.match_confidence > 0 && (
                  <span className="text-sm text-gray-500">
                    置信度: {(listing.match_confidence * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <h4 className="font-medium text-gray-900 mb-1">{listing.title}</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>平台: {listing.platform} | 店铺: {listing.shop_name}</p>
                <p>价格: ¥{listing.price}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 ml-4 min-w-[200px]">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="SPU ID"
                  value={selectedSpuId[listing.id] || ''}
                  onChange={(e) =>
                    setSelectedSpuId((prev) => ({
                      ...prev,
                      [listing.id]: e.target.value,
                    }))
                  }
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <button
                  onClick={() => {
                    const spuId = parseInt(selectedSpuId[listing.id])
                    if (spuId) {
                      onLinkToSpu(listing.id, spuId)
                    }
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  关联
                </button>
              </div>
              <button
                onClick={() => onCreateSpu(listing)}
                className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
              >
                创建新 SPU
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
