import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Boxes, ExternalLink, Loader2, Download } from 'lucide-react'
import { useSpuStore } from '../../stores/spuStore'
import { spuApi } from '../../services/spuApi'
import { useToastStore } from '../../stores/toastStore'
import Sidebar from '../../components/Sidebar'
import ListingTable from './components/ListingTable'

export default function SpuDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToastStore()
  const { currentSpu, currentListings, detailLoading, fetchSpu, fetchListings } = useSpuStore()
  const [activeTab, setActiveTab] = useState('info')
  const [showImportForm, setShowImportForm] = useState(false)
  const [importKeyword, setImportKeyword] = useState('')
  const [importMaxResults, setImportMaxResults] = useState(100)
  const [importLoading, setImportLoading] = useState(false)
  const [importJobId, setImportJobId] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchSpu(Number(id))
      fetchListings(Number(id))
    }
  }, [id])

  // Pre-fill import keyword when SPU loads
  useEffect(() => {
    if (currentSpu && !importKeyword) {
      setImportKeyword(`${currentSpu.brand} ${currentSpu.name} ${currentSpu.model}`.trim())
    }
  }, [currentSpu])

  // Poll import job status
  useEffect(() => {
    if (!importJobId) return

    const poll = async () => {
      try {
        const res = await spuApi.getJob(importJobId)
        const job = res.data.data
        setImportStatus(job.status)

        if (job.status === 'completed') {
          setImportJobId(null)
          setImportLoading(false)
          addToast(`导入完成：共导入 ${job.result?.total_imported || 0} 条，成功关联 ${job.result?.auto_linked || 0} 条`, 'success')
          fetchListings(Number(id))
        } else if (job.status === 'failed') {
          setImportJobId(null)
          setImportLoading(false)
          addToast('导入失败：' + (job.error || '未知错误'), 'error')
        }
      } catch (err: any) {
        console.error('Poll job failed', err)
      }
    }

    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [importJobId, id])

  const handleImport = async () => {
    if (!id) return
    const keyword = importKeyword.trim()
    if (!keyword) {
      addToast('请输入搜索关键词', 'error')
      return
    }

    setImportLoading(true)
    setImportStatus('started')

    try {
      const res = await spuApi.importListingsForSpu(Number(id), {
        keyword,
        max_results: importMaxResults,
        platform: 'pdd_ddk',
      })
      const jobId = res.data.data?.job_id
      if (jobId) {
        setImportJobId(jobId)
        setImportStatus('running')
      }
    } catch (err: any) {
      setImportLoading(false)
      setImportStatus(null)
      addToast(err.message || '导入失败', 'error')
    }
  }

  if (detailLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-gray/30 via-white to-rose-gray/20 flex items-center justify-center">
        <Sidebar />
        <div className="ml-[260px] flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-peach" />
        </div>
      </div>
    )
  }

  if (!currentSpu) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-gray/30 via-white to-rose-gray/20">
        <Sidebar />
        <main className="ml-[260px] p-8">
          <div className="text-center text-carbon/60">
            <Boxes className="w-12 h-12 mx-auto mb-3" />
            <p>SPU 不存在或已被删除</p>
            <button
              onClick={() => navigate('/spus')}
              className="mt-4 text-peach hover:underline text-sm"
            >
              返回 SPU 列表
            </button>
          </div>
        </main>
      </div>
    )
  }

  const spu = currentSpu

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-gray/30 via-white to-rose-gray/20">
      <Sidebar />
      <main className="ml-[260px] min-h-screen p-8">
        <div className="page-enter max-w-[1200px] mx-auto">
          <button
            onClick={() => navigate('/spus')}
            className="flex items-center gap-2 text-sm text-carbon/60 hover:text-peach transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </button>

          <div className="flex items-start gap-6 mb-8">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-peach/10 to-peach/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {spu.image_urls && spu.image_urls[0] ? (
                <img src={spu.image_urls[0]} alt={spu.name} className="w-full h-full object-cover" />
              ) : (
                <Boxes className="w-10 h-10 text-peach/60" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-peach/10 text-peach">{spu.brand}</span>
                <span className={`text-sm px-2.5 py-0.5 rounded-full ${
                  spu.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {spu.status === 'active' ? '上架' : '下架'}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-deep-black">{spu.name}</h1>
              <p className="text-sm text-carbon/60 mt-1">{spu.model}</p>
              {spu.price_min && (
                <p className="text-lg font-bold text-deep-black mt-2">
                  ¥{spu.price_min}
                  {spu.price_max && spu.price_max !== spu.price_min && ` - ¥${spu.price_max}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-1 mb-6 border-b border-peach/10">
            {[
              { key: 'info', label: '基本信息' },
              { key: 'attrs', label: '详细属性' },
              { key: 'listings', label: `链接列表 (${currentListings.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                  activeTab === tab.key
                    ? 'text-peach border-peach'
                    : 'text-carbon/60 border-transparent hover:text-deep-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="glass-card p-6">
            {activeTab === 'info' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-carbon/50">分类</label>
                    <p className="text-sm text-deep-black">{spu.category?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-carbon/50">宠物类型</label>
                    <p className="text-sm text-deep-black">{spu.pet_type === 'cat' ? '猫咪' : '狗狗'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-carbon/50">描述</label>
                  <p className="text-sm text-deep-black mt-1">{spu.description || '暂无描述'}</p>
                </div>
              </div>
            )}

            {activeTab === 'attrs' && (
              <div className="space-y-6">
                {spu.ingredients && spu.ingredients.length > 0 && (
                  <div>
                    <label className="text-xs text-carbon/50 mb-2 block">成分</label>
                    <div className="flex flex-wrap gap-2">
                      {spu.ingredients.map((item: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-peach/5 text-peach rounded-full text-xs">{item}</span>
                      ))}
                    </div>
                  </div>
                )}
                {spu.pros && spu.pros.length > 0 && (
                  <div>
                    <label className="text-xs text-carbon/50 mb-2 block">优点</label>
                    <ul className="space-y-1">
                      {spu.pros.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-deep-black flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {spu.cons && spu.cons.length > 0 && (
                  <div>
                    <label className="text-xs text-carbon/50 mb-2 block">缺点</label>
                    <ul className="space-y-1">
                      {spu.cons.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-deep-black flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {spu.nutrition && Object.keys(spu.nutrition).length > 0 && (
                  <div>
                    <label className="text-xs text-carbon/50 mb-2 block">营养成分</label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(spu.nutrition).map(([key, value]) => (
                        <div key={key} className="flex justify-between px-3 py-2 bg-white/50 rounded-lg">
                          <span className="text-xs text-carbon/60">{key}</span>
                          <span className="text-xs text-deep-black font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {spu.extra_attrs && Object.keys(spu.extra_attrs).length > 0 && (
                  <div>
                    <label className="text-xs text-carbon/50 mb-2 block">扩展属性</label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(spu.extra_attrs).map(([key, value]) => (
                        <div key={key} className="flex justify-between px-3 py-2 bg-white/50 rounded-lg">
                          <span className="text-xs text-carbon/60">{key}</span>
                          <span className="text-xs text-deep-black font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'listings' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-carbon/60">
                    {currentListings.length > 0 ? `共 ${currentListings.length} 个外部链接` : '暂无外部链接'}
                  </p>
                  <button
                    onClick={() => setShowImportForm(!showImportForm)}
                    disabled={importLoading}
                    className="px-4 py-2 bg-peach text-white rounded-pill text-sm font-medium pill-button flex items-center gap-2 disabled:opacity-50"
                  >
                    {importLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> 导入中...</>
                    ) : (
                      <><Download className="w-4 h-4" /> 导入链接</>
                    )}
                  </button>
                </div>

                {showImportForm && (
                  <div className="bg-white/50 rounded-xl p-4 mb-4 border border-peach/10">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-carbon/60 mb-1.5">
                          搜索关键词 <span className="text-carbon/40">（留空则使用 SPU 品牌+名称+型号）</span>
                        </label>
                        <input
                          type="text"
                          value={importKeyword}
                          onChange={(e) => setImportKeyword(e.target.value)}
                          placeholder="例如：皇家猫粮、渴望狗粮..."
                          className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-pill text-sm text-deep-black placeholder:text-carbon/40 focus:outline-none focus:border-peach/40"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-carbon/60 mb-1.5">最大数量</label>
                          <input
                            type="number"
                            value={importMaxResults}
                            onChange={(e) => setImportMaxResults(Number(e.target.value))}
                            min={10}
                            max={500}
                            className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-pill text-sm text-deep-black focus:outline-none focus:border-peach/40"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-carbon/60 mb-1.5">数据来源</label>
                          <select
                            disabled
                            className="w-full px-4 py-2.5 bg-gray-100 border border-peach/10 rounded-pill text-sm text-carbon/60 focus:outline-none cursor-not-allowed"
                          >
                            <option>拼多多 DDK</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={handleImport}
                          disabled={importLoading}
                          className="px-6 py-2.5 bg-peach text-white rounded-pill text-sm font-medium pill-button flex items-center gap-2 disabled:opacity-50"
                        >
                          {importLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> 开始导入...</>
                          ) : (
                            <><Download className="w-4 h-4" /> 开始导入</>
                          )}
                        </button>
                        <button
                          onClick={() => setShowImportForm(false)}
                          disabled={importLoading}
                          className="px-4 py-2.5 text-sm text-carbon hover:text-deep-black transition-colors disabled:opacity-50"
                        >
                          取消
                        </button>
                      </div>
                      {importStatus === 'running' && (
                        <div className="text-sm text-peach flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          正在导入并匹配，请稍候...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentListings.length === 0 && !showImportForm ? (
                  <div className="text-center py-12 text-carbon/40">
                    <ExternalLink className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm">暂无链接</p>
                    <p className="text-xs text-carbon/30 mt-1">点击上方"导入链接"按钮搜索外部商品</p>
                  </div>
                ) : currentListings.length > 0 ? (
                  <ListingTable
                    listings={currentListings}
                    onUnlink={(listingId) => {
                      if (confirm('确定要取消关联这个链接吗？')) {
                        // TODO: implement unlink
                        console.log('Unlink', listingId)
                      }
                    }}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
