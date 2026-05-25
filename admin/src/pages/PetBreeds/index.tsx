import { useEffect, useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import apiClient from '../../services/api'
import Sidebar from '../../components/Sidebar'

interface Breed {
  id: number
  species: string
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string | null
  updated_at: string | null
}

const SPECIES_OPTIONS = ['cat', 'dog', 'bird', 'fish', 'reptile', 'small_pet', 'other']
const SPECIES_LABELS: Record<string, string> = {
  cat: '猫', dog: '狗', bird: '鸟', fish: '鱼', reptile: '爬宠', small_pet: '小宠', other: '其他',
}

export default function PetBreeds() {
  const [breeds, setBreeds] = useState<Breed[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [speciesFilter, setSpeciesFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editBreed, setEditBreed] = useState<Breed | null>(null)
  const [formData, setFormData] = useState({ species: 'cat', name: '', description: '' })
  useLockBodyScroll(showForm)

  const fetchBreeds = async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: 20 }
      if (speciesFilter) params.species = speciesFilter
      const response = await apiClient.get('/admin/pet-breeds', params)
      setBreeds(response.data.breeds || [])
      setTotalPages(Math.ceil((response.data.total || 0) / 20))
    } catch (error) {
      console.error('Failed to fetch breeds', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBreeds()
  }, [page, speciesFilter])

  const handleSave = async () => {
    try {
      if (editBreed) {
        await apiClient.put(`/admin/pet-breeds/${editBreed.id}`, formData)
      } else {
        await apiClient.post('/admin/pet-breeds', formData)
      }
      setShowForm(false)
      setEditBreed(null)
      setFormData({ species: 'cat', name: '', description: '' })
      fetchBreeds()
    } catch (error: any) {
      alert(error.response?.data?.detail || '操作失败')
    }
  }

  const handleDelete = async (breed: Breed) => {
    if (!confirm(`确定要停用品种「${breed.name}」吗？`)) return
    try {
      await apiClient.delete(`/admin/pet-breeds/${breed.id}`)
      fetchBreeds()
    } catch (error) {
      console.error('Failed to delete breed', error)
    }
  }

  const openEdit = (breed: Breed) => {
    setEditBreed(breed)
    setFormData({ species: breed.species, name: breed.name, description: breed.description || '' })
    setShowForm(true)
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
                品种管理
              </h1>
            </div>
            <p className="text-sm text-carbon/60 ml-3">
              管理宠物品种数据，支持添加、编辑和停用
            </p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <select
              value={speciesFilter}
              onChange={(e) => { setSpeciesFilter(e.target.value); setPage(1) }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white"
            >
              <option value="">全部种类</option>
              {SPECIES_OPTIONS.map((s) => (
                <option key={s} value={s}>{SPECIES_LABELS[s]}</option>
              ))}
            </select>
            <button
              onClick={() => { setEditBreed(null); setFormData({ species: 'cat', name: '', description: '' }); setShowForm(true) }}
              className="flex items-center gap-1.5 px-4 py-2 bg-peach text-white rounded-lg hover:bg-peach/90 text-sm"
            >
              <Plus className="w-4 h-4" />
              添加品种
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="w-5 h-5 animate-spin text-peach" />
                <span className="ml-2 text-sm text-carbon/60">加载中...</span>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/30 bg-white/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-carbon/60 uppercase tracking-wider">ID</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-carbon/60 uppercase tracking-wider">种类</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-carbon/60 uppercase tracking-wider">名称</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-carbon/60 uppercase tracking-wider">描述</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-carbon/60 uppercase tracking-wider">状态</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-carbon/60 uppercase tracking-wider">排序</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-carbon/60 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {breeds.map((breed) => (
                    <tr key={breed.id} className="border-b border-white/20 hover:bg-white/40 transition-colors">
                      <td className="px-6 py-3 text-sm text-carbon/80">{breed.id}</td>
                      <td className="px-6 py-3"><span className="text-sm text-carbon/80">{SPECIES_LABELS[breed.species] || breed.species}</span></td>
                      <td className="px-6 py-3"><span className="text-sm font-medium text-deep-black">{breed.name}</span></td>
                      <td className="px-6 py-3"><span className="text-sm text-carbon/60">{breed.description || '-'}</span></td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${breed.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {breed.is_active ? '启用' : '停用'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-carbon/60">{breed.sort_order}</td>
                      <td className="px-6 py-3 text-right">
                        <button onClick={() => openEdit(breed)} className="text-xs text-peach hover:text-peach/80 mr-3">编辑</button>
                        {breed.is_active && (
                          <button onClick={() => handleDelete(breed)} className="text-xs text-red-400 hover:text-red-600">停用</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-white/30">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`px-3 py-1 text-xs rounded-lg ${page === i + 1 ? 'bg-peach text-white' : 'bg-white text-carbon/60 hover:bg-gray-50'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/45 z-[100] flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-[400px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-deep-black mb-4">{editBreed ? '编辑品种' : '添加品种'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-carbon/60 mb-1 block">种类</label>
                <select
                  value={formData.species}
                  onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                >
                  {SPECIES_OPTIONS.map((s) => (
                    <option key={s} value={s}>{SPECIES_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-carbon/60 mb-1 block">品种名称</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  placeholder="如：英短"
                />
              </div>
              <div>
                <label className="text-xs text-carbon/60 mb-1 block">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none"
                  rows={3}
                  placeholder="可选"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-carbon/60 hover:bg-gray-100 rounded-lg">取消</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-peach text-white rounded-lg hover:bg-peach/90">{editBreed ? '保存' : '添加'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
