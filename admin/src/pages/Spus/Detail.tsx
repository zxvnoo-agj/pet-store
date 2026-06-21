import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Boxes, ExternalLink, Loader2, Download, Plus, RefreshCw, Search } from 'lucide-react'
import { useSpuStore } from '../../stores/spuStore'
import { spuApi } from '../../services/spuApi'
import { useToastStore } from '../../stores/toastStore'
import Sidebar from '../../components/Sidebar'
import ListingTable from './components/ListingTable'
import { formatAttributeValue, getSpuAttributeTemplate, getTemplateFieldKeys } from '../../config/spuAttributeTemplates'

export default function SpuDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToastStore()
  const { currentSpu, currentListings, detailLoading, fetchSpu, fetchListings } = useSpuStore()
  const [activeTab, setActiveTab] = useState('info')
  const [showImportForm, setShowImportForm] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [importKeyword, setImportKeyword] = useState('')
  const [importMaxResults, setImportMaxResults] = useState(10)
  const [importLoading, setImportLoading] = useState(false)
  const [importJobId, setImportJobId] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [manualForm, setManualForm] = useState({
    title: '',
    shop_name: '',
    price: '',
    original_price: '',
    url: '',
    image_url: '',
    goods_id: '',
    goods_sign: '',
    is_primary: false,
  })

  useEffect(() => {
    if (id) {
      fetchSpu(Number(id))
      fetchListings(Number(id))
      fetchJobs(Number(id))
    }
  }, [id])

  // Pre-fill import keyword when SPU loads
  useEffect(() => {
    if (currentSpu && !importKeyword) {
      setImportKeyword(`${currentSpu.brand} ${currentSpu.name} ${currentSpu.model}`.trim())
    }
  }, [currentSpu])

  const fetchJobs = async (spuId: number) => {
    try {
      const res = await spuApi.listCollectionJobs({
        spu_id: spuId,
        page: 1,
        page_size: 6,
      })
      setJobs(res.data.data?.items || [])
    } catch (err) {
      console.error('Fetch collection jobs failed', err)
    }
  }

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
          fetchJobs(Number(id))
        } else if (job.status === 'failed') {
          setImportJobId(null)
          setImportLoading(false)
          addToast('导入失败：' + (job.error || '未知错误'), 'error')
          fetchJobs(Number(id))
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
        source: 'pdd_ddk',
      })
      const jobId = res.data.data?.job_id
      if (jobId) {
        setImportJobId(String(jobId))
        setImportStatus('running')
      }
    } catch (err: any) {
      setImportLoading(false)
      setImportStatus(null)
      addToast(err.message || '导入失败', 'error')
    }
  }

  const handleCreateListing = async () => {
    if (!id) return
    if (!manualForm.title.trim()) {
      addToast('请输入商品标题', 'error')
      return
    }
    try {
      await spuApi.createListing(Number(id), {
        platform: 'pdd',
        title: manualForm.title.trim(),
        shop_name: manualForm.shop_name.trim(),
        price: Number(manualForm.price || 0),
        original_price: manualForm.original_price ? Number(manualForm.original_price) : null,
        url: manualForm.url.trim(),
        image_url: manualForm.image_url.trim(),
        goods_id: manualForm.goods_id.trim(),
        goods_sign: manualForm.goods_sign.trim(),
        is_primary: manualForm.is_primary,
        match_status: 'linked',
      })
      addToast('购买商品已添加', 'success')
      setShowManualForm(false)
      setManualForm({
        title: '',
        shop_name: '',
        price: '',
        original_price: '',
        url: '',
        image_url: '',
        goods_id: '',
        goods_sign: '',
        is_primary: false,
      })
      fetchSpu(Number(id))
      fetchListings(Number(id))
    } catch (err: any) {
      addToast(err.response?.data?.detail || err.message || '添加失败', 'error')
    }
  }

  const handleRefreshListing = async (listingId: number) => {
    if (!id) return
    try {
      const res = await spuApi.refreshListingPrice(listingId)
      addToast(`价格刷新已排队 (Job #${res.data.data?.job_id})`, 'success')
      fetchJobs(Number(id))
    } catch (err: any) {
      addToast(err.response?.data?.detail || err.message || '刷新失败', 'error')
    }
  }

  const handleSetPrimary = async (listingId: number) => {
    if (!id) return
    try {
      await spuApi.setPrimaryListing(listingId)
      addToast('已设为主推商品', 'success')
      fetchSpu(Number(id))
      fetchListings(Number(id))
    } catch (err: any) {
      addToast(err.response?.data?.detail || err.message || '设置失败', 'error')
    }
  }

  const handleDeleteListing = async (listingId: number) => {
    if (!id || !confirm('确定删除这个购买商品吗？')) return
    try {
      await spuApi.deleteListing(listingId)
      addToast('购买商品已删除', 'success')
      fetchSpu(Number(id))
      fetchListings(Number(id))
    } catch (err: any) {
      addToast(err.response?.data?.detail || err.message || '删除失败', 'error')
    }
  }

  const handleRetryJob = async (jobId: number) => {
    if (!id) return
    try {
      const res = await spuApi.retryCollectionJob(jobId)
      addToast(`重试任务已排队 (Job #${res.data.data?.new_job_id})`, 'success')
      fetchJobs(Number(id))
    } catch (err: any) {
      addToast(err.response?.data?.detail || err.message || '重试失败', 'error')
    }
  }

  const handleUnlinkListing = async (listingId: number) => {
    if (!id || !confirm('确定取消关联这个链接吗？')) return
    try {
      await spuApi.unlinkListing(listingId)
      addToast('已取消关联', 'success')
      fetchSpu(Number(id))
      fetchListings(Number(id))
    } catch (err: any) {
      addToast(err.response?.data?.detail || err.message || '取消关联失败', 'error')
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
  const attributeTemplate = getSpuAttributeTemplate(spu.category?.name)
  const isFoodTemplate = attributeTemplate.kind === 'food'
  const extraAttrs = spu.extra_attrs || {}
  const renderedExtraKeys = getTemplateFieldKeys(attributeTemplate)
  const remainingExtraAttrs = Object.entries(extraAttrs).filter(
    ([key, value]) => !renderedExtraKeys.has(key) && formatAttributeValue(value).trim()
  )

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
              { key: 'listings', label: `购买商品 (${currentListings.length})` },
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
                {isFoodTemplate ? (
                  <>
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
                  </>
                ) : (
                  <>
                    {attributeTemplate.medicalNotice && (
                      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                        医疗相关信息仅作产品资料参考，具体使用请以兽医建议和产品说明书为准。
                      </div>
                    )}
                    {attributeTemplate.sections.map(section => {
                      const visibleFields = section.fields.filter(field => formatAttributeValue(extraAttrs[field.key]).trim())
                      if (visibleFields.length === 0) return null
                      return (
                        <div key={section.title}>
                          <label className="text-xs text-carbon/50 mb-2 block">{section.title}</label>
                          <div className="grid grid-cols-2 gap-3">
                            {visibleFields.map(field => (
                              <div key={field.key} className="flex justify-between px-3 py-2 bg-white/50 rounded-lg gap-4">
                                <span className="text-xs text-carbon/60">{field.label}</span>
                                <span className="text-xs text-deep-black font-medium text-right">{formatAttributeValue(extraAttrs[field.key])}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
                {spu.pros && spu.pros.length > 0 && (
                  <div>
                    <label className="text-xs text-carbon/50 mb-2 block">{isFoodTemplate ? '优点' : '适合的理由'}</label>
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
                    <label className="text-xs text-carbon/50 mb-2 block">{isFoodTemplate ? '缺点' : '注意事项'}</label>
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
                {remainingExtraAttrs.length > 0 && (
                  <div>
                    <label className="text-xs text-carbon/50 mb-2 block">其他参数</label>
                    <div className="grid grid-cols-2 gap-3">
                      {remainingExtraAttrs.map(([key, value]) => (
                        <div key={key} className="flex justify-between px-3 py-2 bg-white/50 rounded-lg">
                          <span className="text-xs text-carbon/60">{key}</span>
                          <span className="text-xs text-deep-black font-medium">{formatAttributeValue(value)}</span>
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
                    {currentListings.length > 0 ? `共 ${currentListings.length} 个购买商品` : '暂无购买商品'}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowManualForm(!showManualForm)}
                      className="px-4 py-2 bg-peach text-white rounded-pill text-sm font-medium pill-button flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> 添加购买商品
                    </button>
                    <button
                      onClick={() => setShowImportForm(!showImportForm)}
                      disabled={importLoading}
                      className="px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-pill text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      {importLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> 搜索中...</>
                      ) : (
                        <><Search className="w-4 h-4" /> 低频搜索补充</>
                      )}
                    </button>
                  </div>
                </div>

                {jobs.length > 0 && (
                  <div className="bg-white/60 rounded-xl p-4 mb-4 border border-peach/10">
                    <div className="flex items-center gap-2 mb-3 text-sm font-medium text-deep-black">
                      <RefreshCw className="w-4 h-4 text-peach" />
                      最近采集/刷新任务
                    </div>
                    <div className="space-y-2">
                      {jobs.map((job) => (
                        <div key={job.id} className="flex items-start justify-between gap-4 text-xs bg-white/70 rounded-lg px-3 py-2">
                          <div>
                            <span className="font-medium text-carbon">#{job.id}</span>
                            <span className="ml-2 text-carbon/60">{job.job_type}</span>
                            {job.error_message && (
                              <div className="text-red-500 mt-1 flex items-start gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span>{job.error_message}</span>
                              </div>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full ${
                            job.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-600'
                              : job.status === 'failed'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}>
                            {job.status === 'completed' ? '完成' : job.status === 'failed' ? '失败' : '进行中'}
                          </span>
                          {job.status === 'failed' && (
                            <button
                              onClick={() => handleRetryJob(job.id)}
                              className="text-xs px-2 py-0.5 rounded-full bg-white border border-red-100 text-red-500 hover:bg-red-50"
                            >
                              重试
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showManualForm && (
                  <div className="bg-white/50 rounded-xl p-4 mb-4 border border-peach/10">
                    <div className="grid grid-cols-2 gap-4">
                      <input className="px-4 py-2.5 bg-white/70 border border-peach/10 rounded-pill text-sm" placeholder="商品标题 *" value={manualForm.title} onChange={e => setManualForm(f => ({ ...f, title: e.target.value }))} />
                      <input className="px-4 py-2.5 bg-white/70 border border-peach/10 rounded-pill text-sm" placeholder="店铺名称" value={manualForm.shop_name} onChange={e => setManualForm(f => ({ ...f, shop_name: e.target.value }))} />
                      <input className="px-4 py-2.5 bg-white/70 border border-peach/10 rounded-pill text-sm" placeholder="价格" type="number" value={manualForm.price} onChange={e => setManualForm(f => ({ ...f, price: e.target.value }))} />
                      <input className="px-4 py-2.5 bg-white/70 border border-peach/10 rounded-pill text-sm" placeholder="原价" type="number" value={manualForm.original_price} onChange={e => setManualForm(f => ({ ...f, original_price: e.target.value }))} />
                      <input className="px-4 py-2.5 bg-white/70 border border-peach/10 rounded-pill text-sm" placeholder="商品链接" value={manualForm.url} onChange={e => setManualForm(f => ({ ...f, url: e.target.value }))} />
                      <input className="px-4 py-2.5 bg-white/70 border border-peach/10 rounded-pill text-sm" placeholder="图片链接" value={manualForm.image_url} onChange={e => setManualForm(f => ({ ...f, image_url: e.target.value }))} />
                      <input className="px-4 py-2.5 bg-white/70 border border-peach/10 rounded-pill text-sm" placeholder="goods_id" value={manualForm.goods_id} onChange={e => setManualForm(f => ({ ...f, goods_id: e.target.value }))} />
                      <input className="px-4 py-2.5 bg-white/70 border border-peach/10 rounded-pill text-sm" placeholder="goods_sign（有值才可转链）" value={manualForm.goods_sign} onChange={e => setManualForm(f => ({ ...f, goods_sign: e.target.value }))} />
                    </div>
                    <label className="flex items-center gap-2 mt-3 text-xs text-carbon/70">
                      <input type="checkbox" checked={manualForm.is_primary} onChange={e => setManualForm(f => ({ ...f, is_primary: e.target.checked }))} />
                      设为主推商品，用作 SPU 首图优先来源
                    </label>
                    <div className="flex items-center gap-3 pt-4">
                      <button onClick={handleCreateListing} className="px-6 py-2.5 bg-peach text-white rounded-pill text-sm font-medium pill-button">保存</button>
                      <button onClick={() => setShowManualForm(false)} className="px-4 py-2.5 text-sm text-carbon hover:text-deep-black transition-colors">取消</button>
                    </div>
                  </div>
                )}

                {showImportForm && (
                  <div className="bg-amber-50/70 rounded-xl p-4 mb-4 border border-amber-100">
                    <div className="flex items-start gap-2 text-xs text-amber-700 mb-3">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>PDD 商品搜索接口容易因调用多、出单少被限制。建议优先手动维护少量可购买商品，仅在缺少商品时低频使用搜索补充。</span>
                    </div>
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
                            min={1}
                            max={20}
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
                          <><Download className="w-4 h-4" /> 低频搜索</>
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
                    <p className="text-xs text-carbon/30 mt-1">建议先点击“添加购买商品”手动维护少量商品</p>
                  </div>
                ) : currentListings.length > 0 ? (
                  <ListingTable
                    listings={currentListings}
                    onUnlink={handleUnlinkListing}
                    onRefresh={handleRefreshListing}
                    onSetPrimary={handleSetPrimary}
                    onDelete={handleDeleteListing}
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
