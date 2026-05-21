import { useEffect, useState } from 'react'
import { Search, Plus, Trash2, Edit3, Loader2, Boxes, SlidersHorizontal } from 'lucide-react'
import { useSpuStore } from '../../stores/spuStore'
import { useToastStore } from '../../stores/toastStore'
import { adminCategoryApi } from '../../services/api'
import Sidebar from '../../components/Sidebar'
import SpuForm from './components/SpuForm'
import SpuCard from './components/SpuCard'

interface Category {
  id: number
  name: string
  pet_type: string
}

export default function Spus() {
  const { spus, total, loading, error, filters, fetchSpus, deleteSpu, setFilters } = useSpuStore()
  const { addToast } = useToastStore()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editSpu, setEditSpu] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [filterBrand, setFilterBrand] = useState(filters.brand || '')
  const [filterCategory, setFilterCategory] = useState<number | ''>(filters.category_id || '')
  const [filterPetType, setFilterPetType] = useState(filters.pet_type || '')
  const [filterStatus, setFilterStatus] = useState(filters.status || '')

  useEffect(() => {
    fetchSpus()
  }, [filters.page, filters.page_size])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await adminCategoryApi.list()
      const data = res.data?.data
      if (Array.isArray(data)) {
        setCategories(data)
      } else if (Array.isArray(data?.items)) {
        setCategories(data.items)
      } else {
        setCategories([])
      }
    } catch (err) {
      console.error('Failed to fetch categories', err)
      setCategories([])
    }
  }

  const handleSearch = () => {
    setFilters({ search, page: 1 })
    fetchSpus({ search, page: 1 })
  }

  const handleApplyFilters = () => {
    const newFilters: any = { page: 1 }
    if (filterBrand) newFilters.brand = filterBrand
    if (filterCategory) newFilters.category_id = Number(filterCategory)
    if (filterPetType) newFilters.pet_type = filterPetType
    if (filterStatus) newFilters.status = filterStatus
    setFilters(newFilters)
    fetchSpus(newFilters)
  }

  const handleResetFilters = () => {
    setFilterBrand('')
    setFilterCategory('')
    setFilterPetType('')
    setFilterStatus('')
    setFilters({ page: 1 })
    fetchSpus({ page: 1 })
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个 SPU 吗？')) return
    try {
      await deleteSpu(id)
      addToast('SPU 删除成功', 'success')
    } catch (err: any) {
      addToast(err.message || '删除失败', 'error')
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
    if (selectedIds.size === spus.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(spus.map((s: any) => s.id)))
    }
  }

  const totalPages = Math.ceil(total / (filters.page_size || 20))

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-gray/30 via-white to-rose-gray/20">
      <Sidebar />
      <main className="ml-[260px] min-h-screen p-8">
        <div className="page-enter max-w-[1400px] mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-5 bg-peach rounded-full" />
              <h1 className="font-serif-display text-2xl font-bold text-deep-black">
                SPU 管理
              </h1>
            </div>
            <p className="text-sm text-carbon/60 ml-3">
              管理标准商品单元，维护品牌、型号、属性和聚合信息
            </p>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-carbon/40" />
              <input
                type="text"
                placeholder="搜索 SPU 名称、品牌或型号..."
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
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-pill text-sm font-medium flex items-center gap-2 transition-all ${
                showFilters
                  ? 'bg-peach text-white'
                  : 'bg-white/50 text-carbon border border-peach/10 hover:bg-white'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              筛选
            </button>
            <button
              onClick={() => { setEditSpu(null); setShowForm(true) }}
              className="px-6 py-3 bg-deep-black text-white rounded-pill text-sm font-medium pill-button flex items-center gap-2 ml-auto"
            >
              <Plus className="w-4 h-4" />
              新建 SPU
            </button>
          </div>

          {showFilters && (
            <div className="glass-card p-5 mb-6">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-carbon/60 mb-1.5">品牌</label>
                  <input
                    type="text"
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    placeholder="筛选品牌..."
                    className="w-full px-3 py-2 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-carbon/60 mb-1.5">分类</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40"
                  >
                    <option value="">全部分类</option>
                    {categories.map((c: Category) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-carbon/60 mb-1.5">宠物类型</label>
                  <select
                    value={filterPetType}
                    onChange={(e) => setFilterPetType(e.target.value)}
                    className="w-full px-3 py-2 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40"
                  >
                    <option value="">全部</option>
                    <option value="cat">猫咪</option>
                    <option value="dog">狗狗</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-carbon/60 mb-1.5">状态</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40"
                  >
                    <option value="">全部</option>
                    <option value="active">上架</option>
                    <option value="inactive">下架</option>
                    <option value="draft">草稿</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-peach/10">
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-sm text-carbon hover:text-deep-black transition-colors"
                >
                  重置
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-5 py-2 text-sm text-white bg-peach rounded-pill hover:shadow-peach transition-all"
                >
                  应用筛选
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="w-5 h-5 animate-spin text-peach" />
              <span className="ml-2 text-sm text-carbon/60">加载中...</span>
            </div>
          ) : spus.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-carbon/40">
              <Boxes className="w-12 h-12 mb-3" />
              <p className="text-sm">暂无 SPU 数据</p>
              <button
                onClick={() => { setEditSpu(null); setShowForm(true) }}
                className="mt-3 text-sm text-peach hover:underline"
              >
                创建第一个 SPU
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={spus.length > 0 && selectedIds.size === spus.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-peach/30 text-peach focus:ring-peach/20"
                />
                <span className="text-xs text-carbon/50">
                  已选择 {selectedIds.size} 项
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {spus.map((spu: any) => (
                  <div key={spu.id} className="relative group">
                    <div className="absolute top-3 left-3 z-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(spu.id)}
                        onChange={() => toggleSelect(spu.id)}
                        className="w-4 h-4 rounded border-peach/30 text-peach focus:ring-peach/20"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditSpu(spu); setShowForm(true) }}
                        className="p-2 rounded-xl bg-white/80 backdrop-blur-sm text-carbon hover:text-peach hover:bg-white shadow-sm transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(spu.id) }}
                        className="p-2 rounded-xl bg-white/80 backdrop-blur-sm text-carbon hover:text-red-500 hover:bg-white shadow-sm transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <SpuCard spu={spu} />
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-xs text-carbon/50">
                    第 {filters.page} 页 / 共 {totalPages} 页
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFilters({ page: Math.max(1, (filters.page || 1) - 1) })}
                      disabled={(filters.page || 1) === 1}
                      className="px-4 py-2 text-sm text-carbon bg-white/50 border border-peach/10 rounded-pill hover:bg-white hover:border-peach/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setFilters({ page: Math.min(totalPages, (filters.page || 1) + 1) })}
                      disabled={(filters.page || 1) === totalPages}
                      className="px-4 py-2 text-sm text-white bg-peach rounded-pill hover:shadow-peach disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showForm && (
        <SpuForm
          spu={editSpu}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchSpus() }}
        />
      )}
    </div>
  )
}
