import { useState, useEffect } from 'react'
import { GitPullRequest, Loader2 } from 'lucide-react'
import { useSpuStore } from '../../stores/spuStore'
import Sidebar from '../../components/Sidebar'
import CandidateList from './components/CandidateList'
import UnmatchedList from './components/UnmatchedList'

export default function MatchingQueue() {
  const [activeTab, setActiveTab] = useState<'candidate' | 'unmatched'>('candidate')

  const queueTotal = useSpuStore((s) => s.queueTotal)
  const queueListings = useSpuStore((s) => s.queueListings)
  const queueLoading = useSpuStore((s) => s.queueLoading)
  const fetchMatchingQueue = useSpuStore((s) => s.fetchMatchingQueue)
  const confirmCandidates = useSpuStore((s) => s.confirmCandidates)
  const rejectCandidates = useSpuStore((s) => s.rejectCandidates)

  useEffect(() => {
    fetchMatchingQueue({ tier: activeTab, page: 1, page_size: 20 })
  }, [activeTab])

  const handleConfirm = async (listingIds: number[]) => {
    await confirmCandidates(listingIds)
    fetchMatchingQueue({ tier: activeTab, page: 1, page_size: 20 })
  }

  const handleReject = async (listingIds: number[]) => {
    await rejectCandidates(listingIds)
    fetchMatchingQueue({ tier: activeTab, page: 1, page_size: 20 })
  }

  const handleRefresh = () => {
    fetchMatchingQueue({ tier: activeTab, page: 1, page_size: 20 })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-gray/30 via-white to-rose-gray/20">
      <Sidebar />
      <main className="ml-[260px] min-h-screen p-8">
        <div className="page-enter max-w-[1200px] mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-5 bg-peach rounded-full" />
              <h1 className="font-serif-display text-2xl font-bold text-deep-black">匹配审核</h1>
            </div>
            <p className="text-sm text-carbon/60 ml-3">
              审核自动匹配的候选结果，处理未匹配的商品链接
            </p>
          </div>

          <div className="flex gap-1 mb-6 border-b border-peach/10">
            <button
              onClick={() => setActiveTab('candidate')}
              className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === 'candidate'
                  ? 'text-peach border-peach'
                  : 'text-carbon/60 border-transparent hover:text-deep-black'
              }`}
            >
              候选匹配
              {queueTotal > 0 && activeTab === 'candidate' && (
                <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded-full">
                  {queueTotal}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('unmatched')}
              className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === 'unmatched'
                  ? 'text-peach border-peach'
                  : 'text-carbon/60 border-transparent hover:text-deep-black'
              }`}
            >
              未匹配
              {queueTotal > 0 && activeTab === 'unmatched' && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {queueTotal}
                </span>
              )}
            </button>
          </div>

          {queueLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="w-5 h-5 animate-spin text-peach" />
              <span className="ml-2 text-sm text-carbon/60">加载中...</span>
            </div>
          ) : !queueListings?.length ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-carbon/40">
              <GitPullRequest className="w-12 h-12 mb-3" />
              <p className="text-sm">
                {activeTab === 'candidate' ? '暂无候选匹配' : '暂无未匹配商品'}
              </p>
              <button
                onClick={handleRefresh}
                className="mt-3 text-sm text-peach hover:underline"
              >
                刷新
              </button>
            </div>
          ) : activeTab === 'candidate' ? (
            <CandidateList onConfirm={handleConfirm} onReject={handleReject} />
          ) : (
            <UnmatchedList />
          )}
        </div>
      </main>
    </div>
  )
}
