import { useSpuStore } from '../../../stores/spuStore'

interface CandidateListProps {
  onConfirm: (listingIds: number[]) => void
  onReject: (listingIds: number[]) => void
}

export default function CandidateList({ onConfirm, onReject }: CandidateListProps) {
  const queueListings = useSpuStore((s: any) => s.queueListings)
  const queueLoading = useSpuStore((s: any) => s.queueLoading)

  if (queueLoading) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>
  }

  if (!queueListings?.length) {
    return <div className="p-8 text-center text-gray-500">暂无候选匹配</div>
  }

  return (
    <div className="space-y-4">
      {queueListings.map((listing: any) => (
        <div key={listing.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  候选
                </span>
                <span className="text-sm text-gray-500">
                  置信度: {(listing.match_confidence * 100).toFixed(1)}%
                </span>
              </div>
              <h4 className="font-medium text-gray-900 mb-1">{listing.title}</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>平台: {listing.platform} | 店铺: {listing.shop_name}</p>
                <p>价格: ¥{listing.price}</p>
                {listing.suggested_spu && (
                  <div className="mt-2 p-2 bg-blue-50 rounded">
                    <p className="text-sm text-blue-800">
                      建议关联: {listing.suggested_spu.brand} {listing.suggested_spu.name} {listing.suggested_spu.model}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 ml-4">
              <button
                onClick={() => onConfirm([listing.id])}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                确认
              </button>
              <button
                onClick={() => onReject([listing.id])}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                拒绝
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
