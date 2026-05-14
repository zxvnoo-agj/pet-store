import { useEffect, useState } from 'react'
import { Trash2, Loader2, FolderTree, Cat, Dog } from 'lucide-react'
import { adminCategoryApi } from '../../services/api'
import Sidebar from '../../components/Sidebar'

interface Category {
  id: number
  name: string
  pet_type: string
  level: number
  sort_order: number
  is_active: boolean
}

const petTypeIcons: Record<string, React.ReactNode> = {
  cat: <Cat className="w-3.5 h-3.5" />,
  dog: <Dog className="w-3.5 h-3.5" />,
}

const petTypeLabels: Record<string, string> = {
  cat: '猫咪',
  dog: '狗狗',
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

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
    <div className="min-h-screen bg-gradient-to-br from-rose-gray/30 via-white to-rose-gray/20">
      <Sidebar />
      <main className="ml-[260px] min-h-screen p-8">
        <div className="page-enter max-w-[1400px] mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-5 bg-peach rounded-full" />
              <h1 className="font-serif-display text-2xl font-bold text-deep-black">
                分类管理
              </h1>
            </div>
            <p className="text-sm text-carbon/60 ml-3">
              管理商品分类体系，支持一级和二级分类
            </p>
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
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">分类名称</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">宠物类型</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">层级</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">排序</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">状态</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category, idx) => (
                        <tr
                          key={category.id}
                          className="border-b border-peach/5 table-row-hover"
                          onMouseEnter={() => setHoveredRow(idx)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          <td className="px-6 py-4 text-sm text-carbon/70 relative">
                            <span className={`absolute left-0 top-0 bottom-0 w-[3px] bg-peach rounded-r-full transition-opacity duration-300 ${
                              hoveredRow === idx ? 'opacity-100' : 'opacity-0'
                            }`} />
                            #{category.id}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-peach/10 to-peach/5 flex items-center justify-center flex-shrink-0">
                                <FolderTree className="w-4 h-4 text-peach/70" />
                              </div>
                              <span className="text-sm text-deep-black font-medium">
                                {category.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 status-badge bg-blue-50/80 text-blue-500">
                              {petTypeIcons[category.pet_type] || <Cat className="w-3.5 h-3.5" />}
                              {petTypeLabels[category.pet_type] || '猫咪'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                category.level === 1
                                  ? 'bg-peach text-white'
                                  : 'bg-rose-gray text-carbon/70'
                              }`}
                            >
                              {category.level}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-carbon/70">{category.sort_order}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`status-badge ${
                                category.is_active
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              <span
                                className={`status-dot ${
                                  category.is_active ? 'bg-emerald-400' : 'bg-gray-300'
                                }`}
                              />
                              {category.is_active ? '启用' : '禁用'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleDelete(category.id)}
                              className="p-2 rounded-xl text-carbon/40 hover:text-red-500 hover:bg-red-50 transition-all duration-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
    </div>
  )
}
