import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Download, Trash2, Edit3, Loader2, Boxes, SlidersHorizontal } from 'lucide-react'
import { useSpuStore } from '../../stores/spuStore'
import { useToastStore } from '../../stores/toastStore'
import { adminCategoryApi } from '../../services/api'
import Sidebar from '../../components/Sidebar'
import SpuForm from './components/SpuForm'
import ImportTrigger from './components/ImportTrigger'

interface Category {
  id: number
  name: string
  pet_type: string
  parent_id: number | null
  level: number
}

export default function Spus() {
  const navigate = useNavigate()
  const { spus, total, loading, error, filters, fetchSpus, deleteSpu, setFilters } = useSpuStore()
  const { addToast } = useToastStore()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editSpu, setEditSpu] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [filterBrand, setFilterBrand] = useState(filters.brand || '')
  const [filterParentId, setFilterParentId] = useState<number | ''>('')
  const [filterCategory, setFilterCategory] = useState<number | ''>(filters.category_id || '')
  const [filterPetType, setFilterPetType] = useState(filters.pet_type || '')
  const [filterStatus, setFilterStatus] = useState(filters.status || '')
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  useEffect(() => {
    // Reset filters on mount to show all SPUs
    const defaultFilters = { page: 1, page_size: 20 }
    setFilters(defaultFilters)
    setSearch('')
    setFilterBrand('')
    setFilterParentId('')
    setFilterCategory('')
    setFilterPetType('')
    setFilterStatus('')
  }, [])

  useEffect(() => {
    fetchSpus()
  }, [filters.page, filters.page_size])

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    setFilterParentId('')
    setFilterCategory('')
  }, [filterPetType])

  const fetchCategories = async () => {
    try {
      const res = await adminCategoryApi.list()
      let categoriesList: Category[] = []
      
      if (Array.isArray(res.data)) {
        categoriesList = res.data
      } else if (res.data && typeof res.data === 'object') {
        if (Array.isArray(res.data.data)) {
          categoriesList = res.data.data
        } else if (Array.isArray(res.data.data?.categories)) {
          categoriesList = res.data.data.categories
        } else if (Array.isArray(res.data.items)) {
          categoriesList = res.data.items
        } else if (res.data.id && res.data.name) {
          categoriesList = [res.data]
        } else if (res.data.data && typeof res.data.data === 'object' && res.data.data.id) {
          categoriesList = [res.data.data]
        }
      }
      
      setCategories(categoriesList)
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
    setFilterParentId('')
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
              onClick={() => setShowImport(!showImport)}
              className={`px-6 py-3 rounded-pill text-sm font-medium flex items-center gap-2 transition-all ${
                showImport
                  ? 'bg-peach text-white'
                  : 'bg-white/50 text-carbon border border-peach/10 hover:bg-white'
              }`}
            >
              <Download className="w-4 h-4" />
              导入
            </button>
            <button
              onClick={() => { setEditSpu(null); setShowForm(true) }}
              className="px-6 py-3 bg-deep-black text-white rounded-pill text-sm font-medium pill-button flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新建 SPU
            </button>
          </div>

          {showImport && <ImportTrigger />}

          {showFilters && (
            <div className="glass-card p-5 mb-6">
              <div className="grid grid-cols-5 gap-4">
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
                  <label className="block text-xs text-carbon/60 mb-1.5">父类</label>
                  <select
                    value={filterParentId}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : ''
                      setFilterParentId(val)
                      setFilterCategory('')
                    }}
                    className="w-full px-3 py-2 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40"
                  >
                    <option value="">全部父类</option>
                    {categories
                      .filter(c => !filterPetType || c.pet_type === filterPetType)
                      .filter(c => c.level === 1)
                      .map((c: Category) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-carbon/60 mb-1.5">子类</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : '')}
                    disabled={!filterParentId}
                    className="w-full px-3 py-2 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">全部子类</option>
                    {categories
                      .filter(c => c.parent_id === filterParentId && c.level === 2)
                      .map((c: Category) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
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
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-peach/10">
                        <th className="px-6 py-4 text-left">
                          <input
                            type="checkbox"
                            checked={spus.length > 0 && selectedIds.size === spus.length}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-peach/30 text-peach focus:ring-peach/20"
                          />
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">SPU 信息</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">品牌</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">分类</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">价格区间</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">状态</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spus.map((spu: any, idx: number) => (
                        <tr
                          key={spu.id}
                          className="border-b border-peach/5 table-row-hover cursor-pointer"
                          onMouseEnter={() => setHoveredRow(idx)}
                          onMouseLeave={() => setHoveredRow(null)}
                          onClick={() => navigate(`/spus/${spu.id}`)}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(spu.id)}
                              onChange={() => toggleSelect(spu.id)}
                              className="w-4 h-4 rounded border-peach/30 text-peach focus:ring-peach/20"
                            />
                          </td>
                          <td className="px-6 py-4 text-sm text-carbon/70 relative">
                            <span className={`absolute left-0 top-0 bottom-0 w-[3px] bg-peach rounded-r-full transition-opacity duration-300 ${
                              hoveredRow === idx ? 'opacity-100' : 'opacity-0'
                            }`} />
                            #{spu.id}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm text-deep-black font-medium">
                                {spu.name}
                              </span>
                              <span className="text-xs text-carbon/50">
                                型号: {spu.model}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-carbon">{spu.brand || '-'}</td>
                          <td className="px-6 py-4">
                            {spu.category ? (
                              <span className="status-badge bg-peach/10 text-peach">
                                {spu.category.name}
                              </span>
                            ) : (
                              <span className="text-sm text-carbon/40">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-deep-black font-medium">
                            {spu.price_min ? `¥${spu.price_min}` : '-'}
                            {spu.price_max ? ` - ¥${spu.price_max}` : ''}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`status-badge ${
                                spu.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {spu.status === 'active' ? '上架' : '下架'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditSpu(spu); setShowForm(true) }}
                                className="p-2 rounded-xl text-carbon/40 hover:text-peach hover:bg-peach/10 transition-all duration-300"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(spu.id) }}
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
              </div>
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
