import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, Loader2, FolderTree, Cat, Dog, X } from 'lucide-react'
import { adminCategoryApi } from '../../services/api'
import Sidebar from '../../components/Sidebar'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'

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
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    pet_type: 'cat',
    level: 1,
    parent_id: '',
    icon: '',
    sort_order: 0,
    is_active: true,
  })

  const resetForm = () => {
    setForm({ name: '', pet_type: 'cat', level: 1, parent_id: '', icon: '', sort_order: 0, is_active: true })
  }

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

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSubmitting(true)
    try {
      await adminCategoryApi.create({
        name: form.name,
        pet_type: form.pet_type,
        level: form.level,
        parent_id: form.parent_id ? parseInt(form.parent_id) : null,
        icon: form.icon || null,
        sort_order: form.sort_order,
        is_active: form.is_active,
      })
      setShowModal(false)
      resetForm()
      fetchCategories()
    } catch (error) {
      console.error('Failed to create category', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-gray/30 via-white to-rose-gray/20">
      <Sidebar />
      {showModal && (
        <CreateCategoryModal
          form={form}
          setForm={setForm}
          submitting={submitting}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
        />
      )}
      <main className="ml-[260px] min-h-screen p-8">
        <div className="page-enter max-w-[1400px] mx-auto">
          <div className="mb-8 flex items-start justify-between">
            <div>
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
            <button
              onClick={() => { resetForm(); setShowModal(true) }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-white bg-peach rounded-pill hover:shadow-peach transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              新增分类
            </button>
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

function CreateCategoryModal({
  form,
  setForm,
  submitting,
  onClose,
  onSubmit,
}: {
  form: { name: string; pet_type: string; level: number; parent_id: string; icon: string; sort_order: number; is_active: boolean }
  setForm: React.Dispatch<React.SetStateAction<typeof form>>
  submitting: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  useLockBodyScroll()
  const [parentOptions, setParentOptions] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    adminCategoryApi.list({ page_size: 100 }).then(res => {
      const cats = res.data.data.categories || []
      setParentOptions(cats.filter((c: any) => c.level === 1).map((c: any) => ({ id: c.id, name: c.name })))
    }).catch(() => {})
  }, [])

  const inputStyle = 'w-full px-3 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm text-deep-black placeholder:text-carbon/30 focus:outline-none focus:border-peach/40 focus:bg-white/80 transition-all duration-300'
  const labelStyle = 'block text-xs font-medium text-carbon/60 mb-1.5'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-peach/10">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-peach rounded-full" />
            <h2 className="font-serif-display text-lg font-bold text-deep-black">新增分类</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-carbon/40 hover:text-carbon hover:bg-peach/10 transition-all duration-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelStyle}>分类名称</label>
            <input className={inputStyle} placeholder="如：猫粮、猫砂" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>宠物类型</label>
              <select className={inputStyle} value={form.pet_type} onChange={e => setForm(f => ({ ...f, pet_type: e.target.value }))}>
                <option value="cat">猫咪</option>
                <option value="dog">狗狗</option>
              </select>
            </div>
            <div>
              <label className={labelStyle}>层级</label>
              <select className={inputStyle} value={form.level} onChange={e => setForm(f => ({ ...f, level: parseInt(e.target.value), parent_id: parseInt(e.target.value) === 1 ? '' : f.parent_id }))}>
                <option value={1}>一级分类</option>
                <option value={2}>二级分类</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>父分类</label>
              {form.level === 1 ? (
                <div className={inputStyle + ' text-carbon/40 cursor-not-allowed bg-peach/[0.02]'}>
                  一级分类无父分类
                </div>
              ) : (
                <select
                  className={inputStyle}
                  value={form.parent_id}
                  onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}
                >
                  <option value="">请选择父分类</option>
                  {parentOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className={labelStyle}>排序</label>
              <input className={inputStyle} type="number" placeholder="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          <div>
            <label className={labelStyle}>图标标识</label>
            <input className={inputStyle} placeholder="如: cat-food, litter" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-peach/30 text-peach focus:ring-peach/30"
            />
            <label htmlFor="is_active" className="text-sm text-deep-black">启用</label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-peach/10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm text-carbon bg-white/50 border border-peach/10 rounded-pill hover:bg-white hover:border-peach/30 transition-all duration-300"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting || !form.name.trim()}
            className="px-5 py-2.5 text-sm text-white bg-peach rounded-pill hover:shadow-peach disabled:opacity-50 transition-all duration-300 flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? '创建中...' : '创建'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
