import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { Plus, Trash2, Loader2, FolderTree, Cat, Dog, X, ChevronDown, ChevronRight } from 'lucide-react'
import { adminCategoryApi } from '../../services/api'
import Sidebar from '../../components/Sidebar'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'

interface Category {
  id: number
  name: string
  pet_type: string
  parent_id?: number | null
  level: number
  icon?: string | null
  sort_order: number
  is_active: boolean
  children?: Category[]
}

interface TreeRow {
  category: Category
  depth: number
  childCount: number
  hasChildren: boolean
}

const petTypeIcons: Record<string, ReactNode> = {
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
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
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
      const response = await adminCategoryApi.list({ tree: true, page_size: 100 })
      const nextCategories = response.data.data.categories || []
      setCategories(nextCategories)
      setExpandedIds(new Set(nextCategories.map((category: Category) => category.id)))
    } catch (error) {
      console.error('Failed to fetch categories', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const groupedCategories = useMemo(() => {
    return categories.reduce<Record<string, Category[]>>((acc, category) => {
      if (!acc[category.pet_type]) acc[category.pet_type] = []
      acc[category.pet_type].push(category)
      return acc
    }, {})
  }, [categories])

  const treeRows = useMemo(() => {
    const rows: Array<{ type: 'group'; petType: string; rootCount: number; totalCount: number } | ({ type: 'category' } & TreeRow)> = []

    Object.entries(groupedCategories)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([petType, roots]) => {
        const totalCount = roots.reduce((sum, root) => sum + 1 + (root.children?.length || 0), 0)
        rows.push({ type: 'group', petType, rootCount: roots.length, totalCount })

        roots
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
          .forEach((root) => {
            const children = (root.children || []).slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
            rows.push({
              type: 'category',
              category: root,
              depth: 0,
              childCount: children.length,
              hasChildren: children.length > 0,
            })

            if (expandedIds.has(root.id)) {
              children.forEach((child) => {
                rows.push({
                  type: 'category',
                  category: child,
                  depth: 1,
                  childCount: child.children?.length || 0,
                  hasChildren: Boolean(child.children?.length),
                })
              })
            }
          })
      })

    return rows
  }, [expandedIds, groupedCategories])

  const totalCount = useMemo(() => {
    return categories.reduce((sum, category) => sum + 1 + (category.children?.length || 0), 0)
  }, [categories])

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个分类吗？')) return
    try {
      await adminCategoryApi.delete(id)
      fetchCategories()
    } catch (error) {
      console.error('Failed to delete category', error)
    }
  }

  const toggleExpanded = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
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
                      {treeRows.map((row, idx) => {
                        if (row.type === 'group') {
                          return (
                            <tr key={`group-${row.petType}`} className="bg-peach/[0.04] border-b border-peach/10">
                              <td colSpan={7} className="px-6 py-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-deep-black">
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white text-peach shadow-sm">
                                    {petTypeIcons[row.petType] || <Cat className="w-3.5 h-3.5" />}
                                  </span>
                                  <span>{petTypeLabels[row.petType] || row.petType}</span>
                                  <span className="text-xs font-normal text-carbon/50">
                                    {row.rootCount} 个一级分类 / 共 {row.totalCount} 个分类
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )
                        }

                        const { category, depth, childCount, hasChildren } = row
                        const isParent = depth === 0

                        return (
                          <tr
                            key={category.id}
                            className={`border-b border-peach/5 table-row-hover ${
                              isParent ? 'bg-white/30' : 'bg-white/10'
                            }`}
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
                              <div className="flex items-center gap-3" style={{ paddingLeft: depth * 32 }}>
                                <button
                                  type="button"
                                  onClick={() => hasChildren && toggleExpanded(category.id)}
                                  disabled={!hasChildren}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                    hasChildren
                                      ? 'text-carbon/50 hover:text-peach hover:bg-peach/10'
                                      : 'text-carbon/15 cursor-default'
                                  }`}
                                >
                                  {hasChildren ? (
                                    expandedIds.has(category.id)
                                      ? <ChevronDown className="w-4 h-4" />
                                      : <ChevronRight className="w-4 h-4" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-carbon/20" />
                                  )}
                                </button>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                  isParent
                                    ? 'bg-gradient-to-br from-peach/15 to-peach/5'
                                    : 'bg-rose-gray/60'
                                }`}>
                                  <FolderTree className={`w-4 h-4 ${isParent ? 'text-peach/80' : 'text-carbon/45'}`} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm text-deep-black ${isParent ? 'font-semibold' : 'font-medium'}`}>
                                      {category.name}
                                    </span>
                                    {isParent && (
                                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-peach/10 text-peach">
                                        {childCount} 个子类
                                      </span>
                                    )}
                                  </div>
                                  {depth > 0 && (
                                    <p className="text-xs text-carbon/40 mt-0.5">
                                      上级分类 ID: {category.parent_id || '-'}
                                    </p>
                                  )}
                                </div>
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
                                className={`inline-flex items-center justify-center px-2.5 h-6 rounded-full text-xs font-bold ${
                                  isParent
                                    ? 'bg-peach text-white'
                                    : 'bg-rose-gray text-carbon/70'
                                }`}
                              >
                                {isParent ? '一级' : '二级'}
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
                                title="删除分类"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-peach/10">
                  <p className="text-xs text-carbon/50">
                    当前展示 {totalCount} 个分类，按宠物类型和父子关系组织
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedIds(new Set(categories.map(category => category.id)))}
                      className="px-4 py-2 text-sm text-carbon bg-white/50 border border-peach/10 rounded-pill hover:bg-white hover:border-peach/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      展开全部
                    </button>
                    <button
                      onClick={() => setExpandedIds(new Set())}
                      className="px-4 py-2 text-sm text-white bg-peach rounded-pill hover:shadow-peach disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      收起全部
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
