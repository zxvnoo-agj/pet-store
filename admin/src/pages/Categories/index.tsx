import { useEffect, useState } from 'react'
import { adminCategoryApi } from '../../services/api'

interface Category {
  id: number
  name: string
  pet_type: string
  level: number
  sort_order: number
  is_active: boolean
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const response = await adminCategoryApi.list({ page })
      setCategories(response.data.data.categories)
      setTotalPages(response.data.pagination.total_pages)
    } catch (error) {
      console.error('Failed to fetch categories', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [page])

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个分类吗？')) return
    try {
      await adminCategoryApi.delete(id)
      fetchCategories()
    } catch (error) {
      console.error('Failed to delete category', error)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">分类管理</h2>
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
                <th className="p-4 text-left">宠物类型</th>
                <th className="p-4 text-left">层级</th>
                <th className="p-4 text-left">排序</th>
                <th className="p-4 text-left">状态</th>
                <th className="p-4 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-t">
                  <td className="p-4">{category.id}</td>
                  <td className="p-4">{category.name}</td>
                  <td className="p-4">{category.pet_type}</td>
                  <td className="p-4">{category.level}</td>
                  <td className="p-4">{category.sort_order}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {category.is_active ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleDelete(category.id)}
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
