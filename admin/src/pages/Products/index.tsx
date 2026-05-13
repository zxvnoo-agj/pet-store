import { useEffect, useState } from 'react'
import { adminProductApi } from '../../services/api'

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

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个商品吗？')) return
    try {
      await adminProductApi.delete(id)
      fetchProducts()
    } catch (error) {
      console.error('Failed to delete product', error)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">商品管理</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="搜索商品"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 border rounded"
          />
          <button
            onClick={() => { setPage(1); fetchProducts() }}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            搜索
          </button>
        </div>
      </div>

      {loading ? (
        <p>加载中...</p>
      ) : (
        <>
          <table className="w-full bg-white rounded-lg shadow">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">名称</th>
                <th className="p-4 text-left">品牌</th>
                <th className="p-4 text-left">价格</th>
                <th className="p-4 text-left">分类</th>
                <th className="p-4 text-left">状态</th>
                <th className="p-4 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="p-4">{product.id}</td>
                  <td className="p-4">{product.name}</td>
                  <td className="p-4">{product.brand || '-'}</td>
                  <td className="p-4">
                    {product.price_min ? `¥${product.price_min}` : '-'} 
                    {product.price_max ? ` - ¥${product.price_max}` : ''}
                  </td>
                  <td className="p-4">{product.category?.name || '-'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.status === 'active' ? '上架' : '下架'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-500 hover:text-red-700"
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
