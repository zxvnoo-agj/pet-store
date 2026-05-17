import { useEffect, useState } from 'react'
import { Search, Trash2, Edit3, Loader2, Package } from 'lucide-react'
import { adminProductApi } from '../../services/api'
import Sidebar from '../../components/Sidebar'
import EditProductModal from '../../components/EditProductModal'

interface Product {
  id: number
  name: string
  brand: string
  price_min: number
  price_max: number
  status: string
  category: { name: string } | null
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [editProductId, setEditProductId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await adminProductApi.list({ page, search })
      setProducts(response.data.data.products)
      setTotalPages(response.data.pagination.total_pages)
    } catch (error) {
      console.error('Failed to fetch products', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [page])

  const handleSearch = () => {
    setPage(1)
    fetchProducts()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个商品吗？')) return
    try {
      await adminProductApi.delete(id)
      fetchProducts()
    } catch (error) {
      console.error('Failed to delete product', error)
    }
  }

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(products.map(p => p.id)))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个商品吗？`)) return
    try {
      await adminProductApi.batchDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
      fetchProducts()
    } catch (error) {
      console.error('Failed to batch delete products', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-gray/30 via-white to-rose-gray/20">
      <Sidebar />
      <main className="ml-[260px] min-h-screen p-8">
        <div className="page-enter max-w-[1400px] mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-5 bg-peach rounded-full" />
              <h1 className="font-serif-display text-2xl font-bold text-deep-black">
                商品管理
              </h1>
            </div>
            <p className="text-sm text-carbon/60 ml-3">
              管理商品信息、库存状态与上架控制
            </p>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-carbon/40" />
              <input
                type="text"
                placeholder="搜索商品名称、品牌或分类..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-11 pr-4 py-3 bg-white/50 backdrop-blur-sm border border-peach/10 rounded-pill text-sm text-deep-black placeholder:text-carbon/40 focus:outline-none focus:border-peach/40 focus:bg-white/80 transition-all duration-300"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-peach text-white rounded-pill text-sm font-medium pill-button flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              搜索
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={handleBatchDelete}
                className="px-6 py-3 bg-red-500 text-white rounded-pill text-sm font-medium pill-button flex items-center gap-2 hover:bg-red-600 transition-all duration-300"
              >
                <Trash2 className="w-4 h-4" />
                批量删除 ({selectedIds.size})
              </button>
            )}
          </div>

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
                        <th className="px-6 py-4 text-left">
                          <input
                            type="checkbox"
                            checked={products.length > 0 && selectedIds.size === products.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-peach/30 text-peach focus:ring-peach/20"
                          />
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">商品信息</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">品牌</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">价格区间</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">分类</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">状态</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product, idx) => (
                        <tr
                          key={product.id}
                          className="border-b border-peach/5 table-row-hover"
                          onMouseEnter={() => setHoveredRow(idx)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(product.id)}
                              onChange={() => toggleSelect(product.id)}
                              className="w-4 h-4 rounded border-peach/30 text-peach focus:ring-peach/20"
                            />
                          </td>
                          <td className="px-6 py-4 text-sm text-carbon/70 relative">
                            <span className={`absolute left-0 top-0 bottom-0 w-[3px] bg-peach rounded-r-full transition-opacity duration-300 ${
                              hoveredRow === idx ? 'opacity-100' : 'opacity-0'
                            }`} />
                            #{product.id}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-peach/10 to-peach/5 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-peach/70" />
                              </div>
                              <span className="text-sm text-deep-black font-medium truncate max-w-[200px]">
                                {product.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-carbon">{product.brand || '-'}</td>
                          <td className="px-6 py-4 text-sm text-deep-black font-medium">
                            {product.price_min ? `¥${product.price_min}` : '-'}
                            {product.price_max ? ` - ¥${product.price_max}` : ''}
                          </td>
                          <td className="px-6 py-4">
                            {product.category ? (
                              <span className="status-badge bg-peach/10 text-peach">
                                {product.category.name}
                              </span>
                            ) : (
                              <span className="text-sm text-carbon/40">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`status-badge ${
                                product.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {product.status === 'active' ? '上架' : '下架'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditProductId(product.id)}
                                className="p-2 rounded-xl text-carbon/40 hover:text-peach hover:bg-peach/10 transition-all duration-300"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="p-2 rounded-xl text-carbon/40 hover:text-red-500 hover:bg-red-50 transition-all duration-300"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
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
