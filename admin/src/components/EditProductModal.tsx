import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { X, Loader2, ExternalLink, Copy, Check } from 'lucide-react'
import { adminProductApi, promotionUrlApi } from '../services/api'

interface ProductDetail {
  id: number
  name: string
  goods_name: string | null
  brand: string | null
  mall_name: string | null
  spec_form: string | null
  age_range: string | null
  pet_type: string
  price_min: number | null
  price_max: number | null
  promotion_rate: number | null
  description: string | null
  image_urls: string[]
  gallery_urls: string[]
  detail_img_urls: string[]
  pros: string[]
  cons: string[]
  ingredients: string[]
  ratings: Record<string, number>
  source_url: string | null
  source_platform: string | null
  category: { id: number; name: string } | null
  status: string
}

interface PromotionUrl {
  short_url: string
  mobile_url: string | null
  we_app_url: string | null
  cached: boolean
}

interface Props {
  productId: number
  onClose: () => void
  onSaved: () => void
}

export default function EditProductModal({ productId, onClose, onSaved }: Props) {
  useLockBodyScroll()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [promoUrl, setPromoUrl] = useState<PromotionUrl | null>(null)
  const [promoError, setPromoError] = useState('')
  const [refreshedPromoRate, setRefreshedPromoRate] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    name: '',
    goods_name: '',
    brand: '',
    mall_name: '',
    spec_form: '',
    age_range: '',
    pet_type: 'cat',
    price_min: '',
    price_max: '',
    description: '',
    image_urls: '',
    gallery_urls: '',
    detail_img_urls: '',
    pros: '',
    cons: '',
    ingredients: '',
    ratings_overall: '',
    ratings_cost_performance: '',
    ratings_quality: '',
    ratings_taste: '',
    source_url: '',
  })

  useEffect(() => {
    adminProductApi.get(productId).then(res => {
      const p = res.data.data.product as ProductDetail
      setProduct(p)
      const ratings = p.ratings || {}
      setForm({
        name: p.name || '',
        goods_name: p.goods_name || '',
        brand: p.brand || '',
        mall_name: p.mall_name || '',
        spec_form: p.spec_form || '',
        age_range: p.age_range || '',
        pet_type: p.pet_type || 'cat',
        price_min: p.price_min != null ? String(p.price_min) : '',
        price_max: p.price_max != null ? String(p.price_max) : '',
        description: p.description || '',
        image_urls: (p.image_urls || []).join('\n'),
        gallery_urls: (p.gallery_urls || []).join('\n'),
        detail_img_urls: (p.detail_img_urls || []).join('\n'),
        pros: (p.pros || []).join('\n'),
        cons: (p.cons || []).join('\n'),
        ingredients: (p.ingredients || []).join('\n'),
        ratings_overall: ratings.overall != null ? String(ratings.overall) : '',
        ratings_cost_performance: ratings.cost_performance != null ? String(ratings.cost_performance) : '',
        ratings_quality: ratings.quality != null ? String(ratings.quality) : '',
        ratings_taste: ratings.taste != null ? String(ratings.taste) : '',
        source_url: p.source_url || '',
      })
    }).catch(err => {
      console.error('Failed to fetch product', err)
    }).finally(() => setLoading(false))
  }, [productId])

  const toLines = (text: string) => text.split('\n').filter(Boolean)
  const toNum = (v: string) => (v ? parseFloat(v) : null)

  const handleSubmit = async () => {
    setSaving(true)
    setPromoUrl(null)
    setPromoError('')
    setRefreshedPromoRate(null)
    try {
      const ratings: Record<string, number> = {}
      const rOverall = toNum(form.ratings_overall)
      const rCp = toNum(form.ratings_cost_performance)
      const rQual = toNum(form.ratings_quality)
      const rTaste = toNum(form.ratings_taste)
      if (rOverall != null) ratings.overall = rOverall
      if (rCp != null) ratings.cost_performance = rCp
      if (rQual != null) ratings.quality = rQual
      if (rTaste != null) ratings.taste = rTaste

      await adminProductApi.update(productId, {
        name: form.name,
        goods_name: form.goods_name || null,
        brand: form.brand || null,
        mall_name: form.mall_name || null,
        spec_form: form.spec_form || null,
        age_range: form.age_range || null,
        pet_type: form.pet_type,
        price_min: toNum(form.price_min),
        price_max: toNum(form.price_max),
        description: form.description || null,
        image_urls: toLines(form.image_urls),
        gallery_urls: toLines(form.gallery_urls),
        detail_img_urls: toLines(form.detail_img_urls),
        pros: toLines(form.pros),
        cons: toLines(form.cons),
        ingredients: toLines(form.ingredients),
        ratings: ratings,
        source_url: form.source_url || null,
        source_platform: 'pdd',
        category_id: product?.category?.id || 1,
      })

      try {
        const refreshRes = await adminProductApi.refreshDdk(productId)
        const updated = refreshRes.data.data.product
        if (updated?.promotion_rate != null) {
          setRefreshedPromoRate(updated.promotion_rate)
        }
      } catch {
      }

      try {
        const promoRes = await promotionUrlApi.get(productId)
        const url = promoRes.data.data as PromotionUrl
        setPromoUrl(url)
        if (url.short_url) {
          await adminProductApi.update(productId, {
            source_url: url.short_url,
            category_id: product?.category?.id || 1,
          })
          setForm(f => ({ ...f, source_url: url.short_url! }))
        }
      } catch (err: any) {
        setPromoError(err.response?.data?.detail || '获取推广链接失败（可能缺少 goods_sign）')
      }

      onSaved()
    } catch (err) {
      console.error('Failed to update product', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-peach" />
          <span className="text-sm text-carbon/60">加载中...</span>
        </div>
      </div>,
      document.body
    )
  }

  const sectionStyle = 'space-y-4'
  const labelStyle = 'block text-xs font-medium text-carbon/60 mb-1.5'
  const inputStyle = 'w-full px-3 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm text-deep-black placeholder:text-carbon/30 focus:outline-none focus:border-peach/40 focus:bg-white/80 transition-all duration-300'
  const textareaStyle = inputStyle + ' resize-none h-24'
  const jsonTextareaStyle = inputStyle + ' resize-none h-20 font-mono text-xs'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-peach/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-peach rounded-full" />
            <h2 className="font-serif-display text-lg font-bold text-deep-black">
              编辑商品
            </h2>
            {product && (
              <span className="text-xs text-carbon/40 ml-1">#{product.id}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-carbon/40 hover:text-carbon hover:bg-peach/10 transition-all duration-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
          <div className={sectionStyle}>
            <h3 className="text-sm font-semibold text-deep-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-peach" />
              基本信息
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelStyle}>商品名称</label>
                <input className={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelStyle}>PDD商品名</label>
                <input className={inputStyle} value={form.goods_name} onChange={e => setForm(f => ({ ...f, goods_name: e.target.value }))} />
              </div>
              <div>
                <label className={labelStyle}>品牌</label>
                <input className={inputStyle} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
              </div>
              <div>
                <label className={labelStyle}>店铺名称</label>
                <input className={inputStyle} value={form.mall_name} onChange={e => setForm(f => ({ ...f, mall_name: e.target.value }))} />
              </div>
              <div>
                <label className={labelStyle}>宠物类型</label>
                <select className={inputStyle} value={form.pet_type} onChange={e => setForm(f => ({ ...f, pet_type: e.target.value }))}>
                  <option value="cat">猫咪</option>
                  <option value="dog">狗狗</option>
                </select>
              </div>
              <div>
                <label className={labelStyle}>形态</label>
                <input className={inputStyle} placeholder="如: 干粮、湿粮" value={form.spec_form} onChange={e => setForm(f => ({ ...f, spec_form: e.target.value }))} />
              </div>
              <div>
                <label className={labelStyle}>年龄段</label>
                <input className={inputStyle} placeholder="如: 幼猫(4-12月)" value={form.age_range} onChange={e => setForm(f => ({ ...f, age_range: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-peach/20 to-transparent" />

          <div className={sectionStyle}>
            <h3 className="text-sm font-semibold text-deep-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-peach" />
              价格
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>最低价 (¥)</label>
                <input className={inputStyle} type="number" step="0.01" value={form.price_min} onChange={e => setForm(f => ({ ...f, price_min: e.target.value }))} />
              </div>
              <div>
                <label className={labelStyle}>最高价 (¥)</label>
                <input className={inputStyle} type="number" step="0.01" value={form.price_max} onChange={e => setForm(f => ({ ...f, price_max: e.target.value }))} />
              </div>
            </div>
            {refreshedPromoRate != null && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
                <span>佣金比例: {refreshedPromoRate}%</span>
                <span className="text-emerald-400">(自动从 DDK 获取)</span>
              </div>
            )}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-peach/20 to-transparent" />

          <div className={sectionStyle}>
            <h3 className="text-sm font-semibold text-deep-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-peach" />
              评分
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelStyle}>综合评分</label>
                <input className={inputStyle} type="number" step="0.1" min="0" max="5" value={form.ratings_overall} onChange={e => setForm(f => ({ ...f, ratings_overall: e.target.value }))} />
              </div>
              <div>
                <label className={labelStyle}>性价比</label>
                <input className={inputStyle} type="number" step="0.1" min="0" max="5" value={form.ratings_cost_performance} onChange={e => setForm(f => ({ ...f, ratings_cost_performance: e.target.value }))} />
              </div>
              <div>
                <label className={labelStyle}>产品质量</label>
                <input className={inputStyle} type="number" step="0.1" min="0" max="5" value={form.ratings_quality} onChange={e => setForm(f => ({ ...f, ratings_quality: e.target.value }))} />
              </div>
              <div>
                <label className={labelStyle}>适口性</label>
                <input className={inputStyle} type="number" step="0.1" min="0" max="5" value={form.ratings_taste} onChange={e => setForm(f => ({ ...f, ratings_taste: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-peach/20 to-transparent" />

          <div className={sectionStyle}>
            <h3 className="text-sm font-semibold text-deep-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-peach" />
              描述与链接
            </h3>
            <div>
              <label className={labelStyle}>商品描述</label>
              <textarea className={textareaStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className={labelStyle}>来源链接</label>
              <input className={inputStyle} placeholder="https://mobile.yangkeduo.com/..." value={form.source_url} onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))} />
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-peach/20 to-transparent" />

          <div className={sectionStyle}>
            <h3 className="text-sm font-semibold text-deep-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-peach" />
              优缺点与成分（每行一个）
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelStyle}>优点</label>
                <textarea className={jsonTextareaStyle} value={form.pros} onChange={e => setForm(f => ({ ...f, pros: e.target.value }))} />
              </div>
              <div>
                <label className={labelStyle}>缺点</label>
                <textarea className={jsonTextareaStyle} value={form.cons} onChange={e => setForm(f => ({ ...f, cons: e.target.value }))} />
              </div>
              <div>
                <label className={labelStyle}>成分</label>
                <textarea className={jsonTextareaStyle} value={form.ingredients} onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-peach/20 to-transparent" />

          <div className={sectionStyle}>
            <h3 className="text-sm font-semibold text-deep-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-peach" />
              图片URL（每行一个）
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelStyle}>商品主图</label>
                <textarea className={jsonTextareaStyle} value={form.image_urls} onChange={e => setForm(f => ({ ...f, image_urls: e.target.value }))} />
              </div>
              <div>
                <label className={labelStyle}>轮播图</label>
                <textarea className={jsonTextareaStyle} value={form.gallery_urls} onChange={e => setForm(f => ({ ...f, gallery_urls: e.target.value }))} />
              </div>
              <div>
                <label className={labelStyle}>详情图</label>
                <textarea className={jsonTextareaStyle} value={form.detail_img_urls} onChange={e => setForm(f => ({ ...f, detail_img_urls: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-peach/10 space-y-3 shrink-0">
          {promoUrl && (
            <div className="bg-emerald-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <ExternalLink className="w-4 h-4" />
                推广链接已生成
                {promoUrl.cached && <span className="text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded-full">缓存</span>}
              </div>
              <div className="space-y-1.5">
                {[
                  { label: '短链接', value: promoUrl.short_url },
                  { label: '移动端', value: promoUrl.mobile_url },
                  { label: '微信小程序', value: promoUrl.we_app_url },
                ].filter(u => u.value).map(u => (
                  <div key={u.label} className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-600/70 w-20 flex-shrink-0">{u.label}</span>
                    <code className="flex-1 truncate bg-white/60 px-2 py-1 rounded-lg text-emerald-800">
                      {u.value}
                    </code>
                    <button
                      onClick={() => handleCopy(u.value!)}
                      className="p-1 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-emerald-500" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {promoError && (
            <div className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
              {promoError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm text-carbon bg-white/50 border border-peach/10 rounded-pill hover:bg-white hover:border-peach/30 transition-all duration-300"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2.5 text-sm text-white bg-peach rounded-pill hover:shadow-peach disabled:opacity-50 transition-all duration-300 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}