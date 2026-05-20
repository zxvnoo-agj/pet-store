import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpuStore } from '../../stores/spuStore'
import CandidateList from './components/CandidateList'
import UnmatchedList from './components/UnmatchedList'

export default function MatchingQueue() {
  const [activeTab, setActiveTab] = useState<'candidate' | 'unmatched'>('candidate')
  const navigate = useNavigate()

  const queueTotal = useSpuStore((s: any) => s.queueTotal)
  const queueLoading = useSpuStore((s: any) => s.queueLoading)
  const fetchMatchingQueue = useSpuStore((s: any) => s.fetchMatchingQueue)
  const confirmCandidates = useSpuStore((s: any) => s.confirmCandidates)
  const rejectCandidates = useSpuStore((s: any) => s.rejectCandidates)

  useEffect(() => {
    fetchMatchingQueue({ match_status: activeTab })
  }, [activeTab])

  const handleConfirm = async (listingIds: number[]) => {
    await confirmCandidates(listingIds)
    fetchMatchingQueue({ match_status: activeTab })
  }

  const handleReject = async (listingIds: number[]) => {
    await rejectCandidates(listingIds)
    fetchMatchingQueue({ match_status: activeTab })
  }

  const handleLinkToSpu = async (listingId: number, spuId: number) => {
    const { spuApi } = await import('../../services/spuApi')
    await spuApi.linkListing(listingId, { spu_id: spuId })
    fetchMatchingQueue({ match_status: activeTab })
  }

  const handleCreateSpu = (listing: any) => {
    // Navigate to SPU creation with pre-filled data
    navigate('/spus', {
      state: {
        prefill: {
          brand: listing.title.split(' ')[0] || '',
          name: listing.title,
        },
      },
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">匹配审核队列</h1>
          <p className="text-gray-600 mt-1">
            审核自动匹配的候选结果，处理未匹配的商品链接
          </p>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('candidate')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'candidate'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              候选匹配
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                {activeTab === 'candidate' ? queueTotal : 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('unmatched')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'unmatched'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              未匹配
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">
                {activeTab === 'unmatched' ? queueTotal : 0}
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'candidate' ? (
          <CandidateList onConfirm={handleConfirm} onReject={handleReject} />
        ) : (
          <UnmatchedList onLinkToSpu={handleLinkToSpu} onCreateSpu={handleCreateSpu} />
        )}

        {queueLoading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  )
}
