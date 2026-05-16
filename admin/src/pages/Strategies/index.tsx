import { useEffect, useState } from 'react'
import { Plus, Play, Trash2, Loader2 } from 'lucide-react'
import { adminCollectApi } from '../../services/api'
import Sidebar from '../../components/Sidebar'

interface Strategy {
  id: number
  data_source_id: number
  name: string
  keywords: string[]
  opt_id: number | null
  price_min: number | null
  price_max: number | null
  sort_type: number
  max_items: number
  last_run_at: string | null
  last_result: { new: number; skipped: number; failed: number } | null
  created_at: string
}

export default function Strategies() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [keywords, setKeywords] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [sortType, setSortType] = useState('0')
  const [maxItems, setMaxItems] = useState('100')
  const [executingId, setExecutingId] = useState<number | null>(null)

  const fetchStrategies = async () => {
    setLoading(true)
    try {
      const resp = await adminCollectApi.listStrategies({ page: 1, page_size: 100 })
      setStrategies(resp.data.data.items)
    } catch (e) {
      console.error('Failed to fetch strategies', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStrategies() }, [])

  const handleCreate = async () => {
    if (!name || !keywords) return
    try {
      await adminCollectApi.createStrategy({
        data_source_id: 1,
        name,
        keywords: keywords.split(/[,\s]+/).filter(Boolean),
        price_min: priceMin ? parseInt(priceMin) : null,
        price_max: priceMax ? parseInt(priceMax) : null,
        sort_type: parseInt(sortType),
        max_items: parseInt(maxItems),
      })
      setShowCreate(false)
      setName('')
      setKeywords('')
      setPriceMin('')
      setPriceMax('')
      fetchStrategies()
    } catch (e) {
      console.error('Failed to create strategy', e)
    }
  }

  const handleExecute = async (id: number) => {
    setExecutingId(id)
    try {
      await adminCollectApi.executeStrategy(id)
      setTimeout(() => fetchStrategies(), 1000)
    } catch (e) {
      console.error('Failed to execute strategy', e)
    } finally {
      setExecutingId(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个搜索策略吗？')) return
    try {
      await adminCollectApi.deleteStrategy(id)
      fetchStrategies()
    } catch (e) {
      console.error('Failed to delete strategy', e)
    }
  }

  const sortLabels: Record<number, string> = { 0: '综合', 2: '销量', 6: '评价' }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-gray/30 via-white to-rose-gray/20">
      <Sidebar />
      <main className="ml-[260px] min-h-screen p-8">
        <div className="page-enter max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-5 bg-peach rounded-full" />
                <h1 className="font-serif-display text-2xl font-bold text-deep-black">搜索策略</h1>
              </div>
              <p className="text-sm text-carbon/60 ml-3">配置拼多多商品搜索策略，自动发现并采集商品</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-peach text-white rounded-pill hover:bg-peach/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">新建策略</span>
            </button>
          </div>

          {showCreate && (
            <div className="glass-card p-6 mb-6">
              <h3 className="font-medium text-deep-black mb-4">新建搜索策略</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input placeholder="策略名称（如 猫粮-销量排序）" value={name} onChange={(e) => setName(e.target.value)}
                  className="px-4 py-2.5 rounded-pill bg-white/70 border border-white/50 text-sm focus:outline-none focus:border-peach" />
                <input placeholder="关键词（用空格或逗号分隔）" value={keywords} onChange={(e) => setKeywords(e.target.value)}
                  className="px-4 py-2.5 rounded-pill bg-white/70 border border-white/50 text-sm focus:outline-none focus:border-peach" />
                <input placeholder="最低价格（元）" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                  className="px-4 py-2.5 rounded-pill bg-white/70 border border-white/50 text-sm focus:outline-none focus:border-peach" />
                <input placeholder="最高价格（元）" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                  className="px-4 py-2.5 rounded-pill bg-white/70 border border-white/50 text-sm focus:outline-none focus:border-peach" />
                <select value={sortType} onChange={(e) => setSortType(e.target.value)}
                  className="px-4 py-2.5 rounded-pill bg-white/70 border border-white/50 text-sm focus:outline-none focus:border-peach">
                  <option value="0">综合排序</option>
                  <option value="2">销量排序</option>
                  <option value="6">评价排序</option>
                </select>
                <input placeholder="单次上限" value={maxItems} onChange={(e) => setMaxItems(e.target.value)}
                  className="px-4 py-2.5 rounded-pill bg-white/70 border border-white/50 text-sm focus:outline-none focus:border-peach" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate} className="px-5 py-2.5 bg-peach text-white rounded-pill text-sm hover:bg-peach/90">创建</button>
                <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 text-carbon/70 rounded-pill text-sm hover:bg-white/60">取消</button>
              </div>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/30 text-xs text-carbon/60 uppercase tracking-wider">
                  <th className="text-left px-6 py-4 font-medium">策略名称</th>
                  <th className="text-left px-6 py-4 font-medium">关键词</th>
                  <th className="text-left px-6 py-4 font-medium">价格区间</th>
                  <th className="text-left px-6 py-4 font-medium">排序</th>
                  <th className="text-left px-6 py-4 font-medium">上次执行</th>
                  <th className="text-left px-6 py-4 font-medium">上次结果</th>
                  <th className="text-right px-6 py-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-peach" /></td></tr>
                ) : strategies.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-carbon/40 text-sm">暂无策略</td></tr>
                ) : strategies.map((s) => (
                  <tr key={s.id} className="border-b border-white/20 hover:bg-white/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-deep-black font-medium">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-carbon/70">{(s.keywords || []).join(', ')}</td>
                    <td className="px-6 py-4 text-sm text-carbon/70">
                      {s.price_min != null ? `${s.price_min}元` : ''}{s.price_min != null && s.price_max != null ? ' ~ ' : ''}{s.price_max != null ? `${s.price_max}元` : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-carbon/70">{sortLabels[s.sort_type] || s.sort_type}</td>
                    <td className="px-6 py-4 text-sm text-carbon/60">{s.last_run_at ? new Date(s.last_run_at).toLocaleString() : '未执行'}</td>
                    <td className="px-6 py-4 text-sm text-carbon/70">
                      {s.last_result ? `新增${s.last_result.new} 跳过${s.last_result.skipped} 失败${s.last_result.failed}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleExecute(s.id)} disabled={executingId === s.id}
                          className="inline-flex items-center gap-1 text-sm text-peach hover:text-peach/80 disabled:opacity-50">
                          {executingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          执行
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="inline-flex items-center gap-1 text-sm text-red-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" /> 删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
