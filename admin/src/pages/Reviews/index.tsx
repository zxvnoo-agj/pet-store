import { useEffect, useState } from 'react'
import { adminReviewApi } from '../../services/api'

interface Review {
  id: number
  product_id: number
  rating: number
  content: string
  status: string
  created_at: string
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('pending')

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const response = await adminReviewApi.list({ page, status: statusFilter })
      setReviews(response.data.data.reviews)
      setTotalPages(response.data.pagination.total_pages)
    } catch (error) {
      console.error('Failed to fetch reviews', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [page, statusFilter])

  const handleApprove = async (id: number) => {
    try {
      await adminReviewApi.approve(id)
      fetchReviews()
    } catch (error) {
      console.error('Failed to approve review', error)
    }
  }

  const handleReject = async (id: number) => {
    try {
      await adminReviewApi.reject(id)
      fetchReviews()
    } catch (error) {
      console.error('Failed to reject review', error)
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">评价审核</h2>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="p-2 border rounded"
        >
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
        </select>
      </div>

      {loading ? (
        <p>加载中...</p>
      ) : (
        <>
          <table className="w-full bg-white rounded-lg shadow">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">商品ID</th>
                <th className="p-4 text-left">评分</th>
                <th className="p-4 text-left">内容</th>
                <th className="p-4 text-left">状态</th>
                <th className="p-4 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id} className="border-t">
                  <td className="p-4">{review.id}</td>
                  <td className="p-4">{review.product_id}</td>
                  <td className="p-4">{review.rating}/5</td>
                  <td className="p-4 max-w-md truncate">{review.content}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      review.status === 'approved' ? 'bg-green-100 text-green-800' :
                      review.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {review.status === 'approved' ? '已通过' :
                       review.status === 'rejected' ? '已拒绝' : '待审核'}
                    </span>
                  </td>
                  <td className="p-4">
                    {review.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(review.id)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          通过
                        </button>
                        <button
                          onClick={() => handleReject(review.id)}
                          className="text-red-500 hover:text-red-700 mr-2"
                        >
                          拒绝
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-4 py-2">第 {page} 页 / 共 {totalPages} 页</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  )
}
