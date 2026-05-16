import { useEffect, useState } from 'react'
import { Loader2, Play, RefreshCw, Plus, Edit3, Trash2 } from 'lucide-react'
import { adminCollectApi, adminProductApi } from '../../services/api'
import Sidebar from '../../components/Sidebar'
import EditProductModal from '../../components/EditProductModal'

interface CollectionProduct {
  product_id: number
  name: string
  status: string
  brand: string | null
  source_platform: string | null
  created_at: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  enriching: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  inactive: 'bg-gray-100 text-gray-600',
  deleted: 'bg-gray-100 text-gray-400',
}

const statusLabels: Record<string, string> = {
  pending: '待采集',
  enriching: '采集中',
  active: '已上架',
  failed: '采集失败',
  inactive: '已下架',
  deleted: '已删除',
}

export default function Collection() {
  const [products, setProducts] = useState<CollectionProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [showSeed, setShowSeed] = useState(false)
  const [seedName, setSeedName] = useState('')
  const [seedUrl, setSeedUrl] = useState('')
  const [seedCategory] = useState('1')
  const [seedPetType, setSeedPetType] = useState('cat')
  const [seeding, setSeeding] = useState(false)
  const [editProductId, setEditProductId] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个商品吗？')) return
    try {
      await adminProductApi.delete(id)
      fetchProducts()
    } catch (e) {
      console.error('Delete failed', e)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params: any = { page }
      if (statusFilter) params.status = statusFilter
      const resp = await adminCollectApi.listProducts(params)
      setProducts(resp.data.data.items)
      setTotalPages(Math.ceil(resp.data.data.total / 20))
    } catch (e) {
      console.error('Failed to fetch collection products', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [page, statusFilter])

  const handleRetry = async (id: number) => {
    try {
      await adminCollectApi.retryProduct(id)
      fetchProducts()
    } catch (e) {
      console.error('Retry failed', e)
    }
  }

  const handleSeed = async () => {
    if (!seedName || !seedUrl) return
    setSeeding(true)
    try {
      await adminCollectApi.seedProduct({
        category_id: parseInt(seedCategory),
        product_name: seedName,
        pdd_url: seedUrl,
        pet_type: seedPetType,
      })
      setShowSeed(false)
      setSeedName('')
      setSeedUrl('')
      setSeedPetType('cat')
      fetchProducts()
    } catch (e) {
      console.error('Seed failed', e)
      alert('添加失败，请检查链接是否正确')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-gray/30 via-white to-rose-gray/20">
      <Sidebar />
      <main className="ml-[260px] min-h-screen p-8">
        <div className="page-enter max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-5 bg-peach rounded-full" />
                <h1 className="font-serif-display text-2xl font-bold text-deep-black">商品采集</h1>
              </div>
              <p className="text-sm text-carbon/60 ml-3">管理商品采集状态，手动添加或重试采集</p>
            </div>
            <button
              onClick={() => setShowSeed(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-peach text-white rounded-pill hover:bg-peach/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">手动添加商品</span>
            </button>
          </div>

          <div className="flex gap-2 mb-6">
            {['', 'pending', 'enriching', 'active', 'failed'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`px-4 py-1.5 rounded-pill text-sm transition-all ${
                  statusFilter === s ? 'bg-peach text-white' : 'bg-white/60 text-carbon/70 hover:bg-peach/10'
                }`}
              >
                {s ? statusLabels[s] : '全部'}
              </button>
            ))}
          </div>

          {showSeed && (
            <div className="glass-card p-6 mb-6">
              <h3 className="font-medium text-deep-black mb-4">手动录入商品</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <input
                  placeholder="商品名称"
                  value={seedName}
                  onChange={(e) => setSeedName(e.target.value)}
                  className="px-4 py-2.5 rounded-pill bg-white/70 border border-white/50 text-sm focus:outline-none focus:border-peach"
                />
                <input
                  placeholder="拼多多商品链接"
                  value={seedUrl}
                  onChange={(e) => setSeedUrl(e.target.value)}
                  className="px-4 py-2.5 rounded-pill bg-white/70 border border-white/50 text-sm focus:outline-none focus:border-peach"
                />
                <select
                  value={seedPetType}
                  onChange={(e) => setSeedPetType(e.target.value)}
                  className="px-4 py-2.5 rounded-pill bg-white/70 border border-white/50 text-sm focus:outline-none focus:border-peach"
                >
                  <option value="cat">猫</option>
                  <option value="dog">狗</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleSeed}
                    disabled={seeding}
                    className="px-5 py-2.5 bg-peach text-white rounded-pill text-sm hover:bg-peach/90 disabled:opacity-50"
                  >
                    {seeding ? '提交中...' : '提交'}
                  </button>
                  <button
                    onClick={() => setShowSeed(false)}
                    className="px-5 py-2.5 text-carbon/70 rounded-pill text-sm hover:bg-white/60"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/30 text-xs text-carbon/60 uppercase tracking-wider">
                  <th className="text-left px-6 py-4 font-medium">商品名称</th>
                  <th className="text-left px-6 py-4 font-medium">品牌</th>
                  <th className="text-left px-6 py-4 font-medium">来源</th>
                  <th className="text-left px-6 py-4 font-medium">状态</th>
                  <th className="text-left px-6 py-4 font-medium">创建时间</th>
                  <th className="text-right px-6 py-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-peach" /></td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-carbon/40 text-sm">暂无数据</td></tr>
                ) : products.map((p) => (
                  <tr key={p.product_id} className="border-b border-white/20 hover:bg-white/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-deep-black font-medium">{p.name}</td>
                    <td className="px-6 py-4 text-sm text-carbon/70">{p.brand || '-'}</td>
                    <td className="px-6 py-4 text-sm text-carbon/70">{p.source_platform || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-gray-100'}`}>
                        {statusLabels[p.status] || p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-carbon/60">{p.created_at ? new Date(p.created_at).toLocaleString() : '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setEditProductId(p.product_id)}
                          className="inline-flex items-center gap-1 text-sm text-carbon/50 hover:text-peach transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> 编辑
                        </button>
                        {p.status === 'pending' && (
                          <>
                            <button onClick={() => handleRetry(p.product_id)} className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600">
                              <Play className="w-3.5 h-3.5" /> 采集
                            </button>
                            <button
                              onClick={() => handleDelete(p.product_id)}
                              className="inline-flex items-center gap-1 text-sm text-carbon/40 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {p.status === 'failed' && (
                          <button onClick={() => handleRetry(p.product_id)} className="inline-flex items-center gap-1 text-sm text-peach hover:text-peach/80">
                            <RefreshCw className="w-3.5 h-3.5" /> 重试
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                    page === p ? 'bg-peach text-white' : 'text-carbon/60 hover:bg-peach/10'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {editProductId != null && (
        <EditProductModal
          productId={editProductId}
          onClose={() => setEditProductId(null)}
          onSaved={() => {
            setEditProductId(null)
            fetchProducts()
          }}
        />
      )}
    </div>
  )
}
