import { useEffect, useState } from 'react'
import {
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  Star,
  MessageSquare,
  Filter,
  Plus,
} from 'lucide-react'
import { adminReviewApi } from '../../services/api'
import Sidebar from '../../components/Sidebar'

interface Review {
  id: number
  spu_id: number
  spu_name?: string
  rating: number
  content: string
  status: string
  source: string
  source_label?: string
  reject_reason?: string
  created_at: string
}

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
]

const sourceOptions = [
  { value: '', label: '全部来源' },
  { value: 'user', label: '用户评价' },
  { value: 'xhs_manual', label: '小红书手动' },
  { value: 'xhs_auto', label: '小红书自动' },
  { value: 'admin_seed', label: '运营整理' },
]

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: '待审核',
    className: 'bg-amber-50 text-amber-600',
  },
  approved: {
    label: '已通过',
    className: 'bg-emerald-50 text-emerald-600',
  },
  rejected: {
    label: '已拒绝',
    className: 'bg-red-50 text-red-500',
  },
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [sourceFilter, setSourceFilter] = useState('')
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    spu_id: '',
    rating: 5,
    content: '',
    source: 'admin_seed' as 'admin_seed' | 'xhs_manual',
    author: '运营整理',
    source_url: '',
  })

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const response = await adminReviewApi.list({
        page,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
      })
      setReviews(response.data.data.reviews)
      setTotalPages(response.data.pagination.total_pages)
    } catch (error) {
      console.error('Failed to fetch reviews', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [statusFilter, sourceFilter])

  useEffect(() => {
    fetchReviews()
  }, [page, statusFilter, sourceFilter])

  const handleApprove = async (id: number) => {
    try {
      await adminReviewApi.approve(id)
      fetchReviews()
    } catch (error) {
      console.error('Failed to approve review', error)
    }
  }

  const handleReject = async (id: number) => {
    const reason = prompt('请输入拒绝原因')
    if (!reason) return
    try {
      await adminReviewApi.reject(id, reason)
      fetchReviews()
    } catch (error) {
      console.error('Failed to reject review', error)
    }
  }

  const handleCreate = async () => {
    if (!createForm.spu_id || !createForm.content.trim()) {
      alert('请填写 SPU ID 和评价内容')
      return
    }
    try {
      await adminReviewApi.create({
        spu_id: Number(createForm.spu_id),
        rating: createForm.rating,
        content: createForm.content.trim(),
        source: createForm.source,
        author: createForm.author || undefined,
        source_url: createForm.source_url || undefined,
        is_recommended: createForm.rating >= 4,
      })
      setShowCreate(false)
      setCreateForm({
        spu_id: '',
        rating: 5,
        content: '',
        source: 'admin_seed',
        author: '运营整理',
        source_url: '',
      })
      fetchReviews()
    } catch (error) {
      console.error('Failed to create review', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条评价吗？')) return
    try {
      await adminReviewApi.delete(id)
      fetchReviews()
    } catch (error) {
      console.error('Failed to delete review', error)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${
            star <= rating
              ? 'text-peach fill-peach'
              : 'text-gray-200 fill-gray-200'
          }`}
        />
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-gray/30 via-white to-rose-gray/20">
      <Sidebar />
      <main className="ml-[260px] min-h-screen p-8">
        <div className="page-enter max-w-[1400px] mx-auto">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-5 bg-peach rounded-full" />
                <h1 className="font-serif-display text-2xl font-bold text-deep-black">
                  评价审核
                </h1>
              </div>
              <p className="text-sm text-carbon/60 ml-3">
                审核用户评价，维护社区内容质量
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-3 bg-peach text-white rounded-pill text-sm font-medium hover:shadow-peach transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
                新增评价
              </button>
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-carbon/40" />
                <select
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value)
                    setPage(1)
                  }}
                  className="pl-11 pr-8 py-3 bg-white/50 backdrop-blur-sm border border-peach/10 rounded-pill text-sm text-deep-black focus:outline-none focus:border-peach/40 appearance-none cursor-pointer transition-all duration-300"
                >
                  {sourceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 mb-6">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-pill text-sm font-medium transition-all duration-300 ${
                  statusFilter === opt.value
                    ? 'bg-peach text-white shadow-peach'
                    : 'bg-white/50 text-carbon/70 hover:bg-white/80 border border-peach/10'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            ))}
          </div>

          {showCreate && (
            <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <div className="w-[560px] bg-white rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-deep-black">新增评价</h2>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="text-carbon/40 hover:text-carbon transition-colors"
                  >
                    关闭
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="text-sm text-carbon/70">
                    <span className="block mb-1">SPU ID</span>
                    <input
                      value={createForm.spu_id}
                      onChange={(e) => setCreateForm({ ...createForm, spu_id: e.target.value })}
                      className="w-full px-3 py-2 border border-peach/20 rounded-xl focus:outline-none focus:border-peach/50"
                      placeholder="例如 12"
                    />
                  </label>
                  <label className="text-sm text-carbon/70">
                    <span className="block mb-1">来源</span>
                    <select
                      value={createForm.source}
                      onChange={(e) => setCreateForm({ ...createForm, source: e.target.value as 'admin_seed' | 'xhs_manual' })}
                      className="w-full px-3 py-2 border border-peach/20 rounded-xl focus:outline-none focus:border-peach/50"
                    >
                      <option value="admin_seed">运营整理</option>
                      <option value="xhs_manual">小红书手动</option>
                    </select>
                  </label>
                  <label className="text-sm text-carbon/70">
                    <span className="block mb-1">评分</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={createForm.rating}
                      onChange={(e) => setCreateForm({ ...createForm, rating: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-peach/20 rounded-xl focus:outline-none focus:border-peach/50"
                    />
                  </label>
                  <label className="text-sm text-carbon/70">
                    <span className="block mb-1">作者</span>
                    <input
                      value={createForm.author}
                      onChange={(e) => setCreateForm({ ...createForm, author: e.target.value })}
                      className="w-full px-3 py-2 border border-peach/20 rounded-xl focus:outline-none focus:border-peach/50"
                    />
                  </label>
                </div>
                <label className="block text-sm text-carbon/70 mt-4">
                  <span className="block mb-1">来源链接</span>
                  <input
                    value={createForm.source_url}
                    onChange={(e) => setCreateForm({ ...createForm, source_url: e.target.value })}
                    className="w-full px-3 py-2 border border-peach/20 rounded-xl focus:outline-none focus:border-peach/50"
                    placeholder="小红书手动来源可填写"
                  />
                </label>
                <label className="block text-sm text-carbon/70 mt-4">
                  <span className="block mb-1">评价内容</span>
                  <textarea
                    value={createForm.content}
                    onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                    className="w-full h-32 px-3 py-2 border border-peach/20 rounded-xl focus:outline-none focus:border-peach/50 resize-none"
                    maxLength={500}
                  />
                </label>
                <div className="flex justify-end gap-3 mt-5">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 rounded-pill bg-rose-gray/50 text-carbon text-sm"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreate}
                    className="px-4 py-2 rounded-pill bg-peach text-white text-sm font-medium"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="w-5 h-5 animate-spin text-peach" />
                <span className="ml-2 text-sm text-carbon/60">加载中...</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-peach/10">
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">商品</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">来源</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">评分</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">评价内容</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">日期</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">状态</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map((review, idx) => {
                        const status = statusConfig[review.status] || statusConfig.pending
                        return (
                          <tr
                            key={review.id}
                            className="border-b border-peach/5 table-row-hover"
                            onMouseEnter={() => setHoveredRow(idx)}
                            onMouseLeave={() => setHoveredRow(null)}
                          >
                            <td className="px-6 py-4 text-sm text-carbon/70 relative">
                              <span className={`absolute left-0 top-0 bottom-0 w-[3px] bg-peach rounded-r-full transition-opacity duration-300 ${
                                hoveredRow === idx ? 'opacity-100' : 'opacity-0'
                              }`} />
                              #{review.id}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-peach/10 to-peach/5 flex items-center justify-center flex-shrink-0">
                                  <MessageSquare className="w-4 h-4 text-peach/70" />
                                </div>
                                <span className="text-sm text-deep-black font-medium">
                                  {review.spu_name || `SPU #${review.spu_id}`}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="status-badge bg-orange-50 text-orange-600">
                                {review.source_label || review.source}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <StarRating rating={review.rating} />
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-carbon max-w-xs truncate">
                                {review.content}
                              </p>
                              {review.reject_reason && (
                                <p className="text-xs text-red-500 max-w-xs truncate mt-1">
                                  原因：{review.reject_reason}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-carbon/60">
                              {formatDate(review.created_at)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`status-badge ${status.className}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                {review.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(review.id)}
                                      className="p-2 rounded-xl text-carbon/40 hover:text-emerald-500 hover:bg-emerald-50 transition-all duration-300"
                                      title="通过"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleReject(review.id)}
                                      className="p-2 rounded-xl text-carbon/40 hover:text-red-500 hover:bg-red-50 transition-all duration-300"
                                      title="拒绝"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleDelete(review.id)}
                                  className="p-2 rounded-xl text-carbon/40 hover:text-red-500 hover:bg-red-50 transition-all duration-300"
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-peach/10">
                  <p className="text-xs text-carbon/50">
                    第 {page} 页 / 共 {totalPages} 页
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm text-carbon bg-white/50 border border-peach/10 rounded-pill hover:bg-white hover:border-peach/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-sm text-white bg-peach rounded-pill hover:shadow-peach disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
