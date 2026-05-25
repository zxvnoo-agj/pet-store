import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'
import { X, Save, Loader2, Sparkles, ImageIcon, Type } from 'lucide-react'
import { useSpuStore } from '../../../stores/spuStore'
import { useToastStore } from '../../../stores/toastStore'
import { adminCategoryApi } from '../../../services/api'
import { spuApi } from '../../../services/spuApi'

interface Category {
  id: number
  name: string
  pet_type: string
  parent_id: number | null
  level: number
}

interface SpuFormProps {
  spu?: any
  onClose: () => void
  onSaved: () => void
}

export default function SpuForm({ spu, onClose, onSaved }: SpuFormProps) {
  useLockBodyScroll()
  const { createSpu, updateSpu } = useSpuStore()
  const { addToast } = useToastStore()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedParentId, setSelectedParentId] = useState<number | ''>('')
  const [formData, setFormData] = useState({
    category_id: spu?.category_id || '',
    brand: spu?.brand || '',
    name: spu?.name || '',
    model: spu?.model || '',
    pet_type: spu?.pet_type || 'cat',
    description: spu?.description || '',
    ingredients: (spu?.ingredients || []).join('\n'),
    nutrition: JSON.stringify(spu?.nutrition || {}, null, 2),
    pros: (spu?.pros || []).join('\n'),
    cons: (spu?.cons || []).join('\n'),
    extra_attrs: JSON.stringify(spu?.extra_attrs || {}, null, 2),
    image_urls: (spu?.image_urls || []).join('\n'),
    status: spu?.status || 'active',
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (spu?.category_id && categories.length > 0) {
      const cat = categories.find(c => c.id === spu.category_id)
      if (cat?.parent_id) {
        setSelectedParentId(cat.parent_id)
      } else if (cat) {
        setSelectedParentId(cat.id)
      }
    } else if (!spu) {
      setSelectedParentId('')
    }
  }, [categories, spu?.category_id])

  const fetchCategories = async () => {
    try {
      const res = await adminCategoryApi.list()
      setCategories(res.data?.data?.categories || [])
    } catch (err) {
      console.error('Failed to fetch categories', err)
      setCategories([])
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.category_id) {
      addToast('请选择一个分类', 'error')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = {
        ...formData,
        category_id: Number(formData.category_id),
        ingredients: formData.ingredients.split('\n').filter(Boolean),
        nutrition: JSON.parse(formData.nutrition || '{}'),
        pros: formData.pros.split('\n').filter(Boolean),
        cons: formData.cons.split('\n').filter(Boolean),
        extra_attrs: JSON.parse(formData.extra_attrs || '{}'),
        image_urls: formData.image_urls.split('\n').filter(Boolean),
      }
      if (spu?.id) {
        await updateSpu(spu.id, data)
        addToast('SPU 更新成功', 'success')
      } else {
        await createSpu(data)
        addToast('SPU 创建成功', 'success')
      }
      onSaved()
    } catch (err: any) {
      addToast(err.response?.data?.message || err.message || '保存失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  // AI extraction helpers
  const [aiLoading, setAiLoading] = useState<{[key: string]: boolean}>({})
  const ingredientsFileRef = useRef<HTMLInputElement>(null)
  const nutritionFileRef = useRef<HTMLInputElement>(null)

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleParseIngredients = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAiLoading(prev => ({ ...prev, ingredients: true }))
    try {
      const base64 = await fileToBase64(file)
      const res = await spuApi.parseIngredients(base64)
      const ingredients = res.data.data?.ingredients || []
      if (ingredients.length > 0) {
        const current = formData.ingredients ? formData.ingredients.split('\n').filter(Boolean) : []
        const merged = Array.from(new Set([...current, ...ingredients]))
        handleChange('ingredients', merged.join('\n'))
        addToast(`成功解析 ${ingredients.length} 种成分`, 'success')
      } else {
        addToast('未能识别成分，请手动输入', 'info')
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || '解析失败', 'error')
    } finally {
      setAiLoading(prev => ({ ...prev, ingredients: false }))
      e.target.value = ''
    }
  }

  const handleParseNutritionFromImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAiLoading(prev => ({ ...prev, nutritionImage: true }))
    try {
      const base64 = await fileToBase64(file)
      const res = await spuApi.parseNutrition(base64)
      const nutrition = res.data.data?.nutrition || {}
      if (Object.keys(nutrition).length > 0) {
        const current = formData.nutrition ? JSON.parse(formData.nutrition) : {}
        const merged = { ...current, ...nutrition }
        handleChange('nutrition', JSON.stringify(merged, null, 2))
        addToast(`成功解析 ${Object.keys(nutrition).length} 项营养指标`, 'success')
      } else {
        addToast('未能识别营养表，请手动输入或转换文本', 'info')
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || '解析失败', 'error')
    } finally {
      setAiLoading(prev => ({ ...prev, nutritionImage: false }))
      e.target.value = ''
    }
  }

  const handleParseNutritionFromText = async () => {
    const text = prompt('请输入营养成分描述（如：粗蛋白32%，粗脂肪15%...）')
    if (!text) return
    setAiLoading(prev => ({ ...prev, nutritionText: true }))
    try {
      const res = await spuApi.parseNutrition(undefined, text)
      const nutrition = res.data.data?.nutrition || {}
      if (Object.keys(nutrition).length > 0) {
        const current = formData.nutrition ? JSON.parse(formData.nutrition) : {}
        const merged = { ...current, ...nutrition }
        handleChange('nutrition', JSON.stringify(merged, null, 2))
        addToast(`成功转换 ${Object.keys(nutrition).length} 项营养指标`, 'success')
      } else {
        addToast('未能转换，请检查输入格式', 'info')
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || '转换失败', 'error')
    } finally {
      setAiLoading(prev => ({ ...prev, nutritionText: false }))
    }
  }

  const handleGenerateProsCons = async () => {
    const ingredients = formData.ingredients.split('\n').filter(Boolean)
    let nutrition = {}
    try {
      nutrition = JSON.parse(formData.nutrition || '{}')
    } catch {}
    if (ingredients.length === 0 && Object.keys(nutrition).length === 0) {
      addToast('请至少填写成分或营养信息', 'info')
      return
    }
    setAiLoading(prev => ({ ...prev, prosCons: true }))
    try {
      const res = await spuApi.generateProsCons(ingredients, nutrition)
      const data = res.data.data || {}
      const pros = data.pros || []
      const cons = data.cons || []
      if (pros.length > 0) {
        const currentPros = formData.pros ? formData.pros.split('\n').filter(Boolean) : []
        handleChange('pros', Array.from(new Set([...currentPros, ...pros])).join('\n'))
      }
      if (cons.length > 0) {
        const currentCons = formData.cons ? formData.cons.split('\n').filter(Boolean) : []
        handleChange('cons', Array.from(new Set([...currentCons, ...cons])).join('\n'))
      }
      addToast(`生成 ${pros.length} 条优点，${cons.length} 条缺点`, 'success')
    } catch (err: any) {
      addToast(err.response?.data?.message || '生成失败', 'error')
    } finally {
      setAiLoading(prev => ({ ...prev, prosCons: false }))
    }
  }

  const parentHasChildren = selectedParentId ? categories.some(c => c.parent_id === selectedParentId && c.level === 2) : false

  const labelStyle = 'block text-xs font-medium text-carbon/60 mb-1.5'
  const inputStyle = 'w-full px-3 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm text-deep-black placeholder:text-carbon/30 focus:outline-none focus:border-peach/40 focus:bg-white/80 transition-all duration-300'
  const textareaStyle = inputStyle + ' resize-none'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-peach/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-peach rounded-full" />
            <h2 className="font-serif-display text-lg font-bold text-deep-black">
              {spu?.id ? '编辑 SPU' : '新建 SPU'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-carbon/40 hover:text-carbon hover:bg-peach/10 transition-all duration-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-deep-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-peach" />
              基本信息
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelStyle}>宠物类型 *</label>
                <select
                  value={formData.pet_type}
                  onChange={(e) => {
                    handleChange('pet_type', e.target.value)
                    setSelectedParentId('')
                    handleChange('category_id', '')
                  }}
                  className={inputStyle}
                >
                  <option value="cat">猫咪</option>
                  <option value="dog">狗狗</option>
                </select>
              </div>
              <div>
                <label className={labelStyle}>分类 *</label>
                <select
                  value={selectedParentId}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : ''
                    setSelectedParentId(val)
                    const hasChildren = categories.some(c => c.parent_id === val && c.level === 2)
                    handleChange('category_id', hasChildren ? '' : String(val))
                  }}
                  className={inputStyle}
                >
                  <option value="">选择分类</option>
                  {categories
                    .filter(c => c.pet_type === formData.pet_type && c.level === 1)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className={labelStyle}>子类</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => handleChange('category_id', e.target.value)}
                  disabled={!selectedParentId || !parentHasChildren}
                  className={inputStyle + ' disabled:opacity-50 disabled:cursor-not-allowed'}
                >
                  <option value="">{parentHasChildren ? '选择子类' : '无子分类'}</option>
                  {categories
                    .filter(c => c.parent_id === selectedParentId && c.level === 2)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>品牌 *</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => handleChange('brand', e.target.value)}
                  placeholder="如: Royal Canin"
                  className={inputStyle}
                />
              </div>
              <div>
                <label className={labelStyle}>型号 *</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  placeholder="如: K36 2kg"
                  className={inputStyle}
                />
              </div>
            </div>

            <div>
              <label className={labelStyle}>商品名称 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="如: Indoor Adult Cat Food"
                className={inputStyle}
              />
            </div>

            <div>
              <label className={labelStyle}>描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                placeholder="商品详细描述..."
                className={textareaStyle}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-deep-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-peach" />
              详细信息
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelStyle}>成分 (每行一个)</label>
                  <button
                    onClick={() => ingredientsFileRef.current?.click()}
                    disabled={aiLoading.ingredients}
                    className="text-xs text-peach hover:text-peach/80 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {aiLoading.ingredients ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ImageIcon className="w-3 h-3" />
                    )}
                    上传图片解析
                  </button>
                  <input
                    ref={ingredientsFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleParseIngredients}
                    className="hidden"
                  />
                </div>
                <textarea
                  value={formData.ingredients}
                  onChange={(e) => handleChange('ingredients', e.target.value)}
                  rows={4}
                  placeholder="Chicken&#10;Rice&#10;Corn"
                  className={textareaStyle}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelStyle}>营养成分 (JSON)</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => nutritionFileRef.current?.click()}
                      disabled={aiLoading.nutritionImage}
                      className="text-xs text-peach hover:text-peach/80 flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {aiLoading.nutritionImage ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ImageIcon className="w-3 h-3" />
                      )}
                      图片
                    </button>
                    <input
                      ref={nutritionFileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleParseNutritionFromImage}
                      className="hidden"
                    />
                    <button
                      onClick={handleParseNutritionFromText}
                      disabled={aiLoading.nutritionText}
                      className="text-xs text-peach hover:text-peach/80 flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {aiLoading.nutritionText ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Type className="w-3 h-3" />
                      )}
                      转文本
                    </button>
                  </div>
                </div>
                <textarea
                  value={formData.nutrition}
                  onChange={(e) => handleChange('nutrition', e.target.value)}
                  rows={4}
                  placeholder='{"protein": "32%", "fat": "15%"}'
                  className={textareaStyle + ' font-mono text-xs'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelStyle}>优点 (每行一个)</label>
                </div>
                <textarea
                  value={formData.pros}
                  onChange={(e) => handleChange('pros', e.target.value)}
                  rows={3}
                  placeholder="High protein&#10;Grain-free"
                  className={textareaStyle}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelStyle}>缺点 (每行一个)</label>
                </div>
                <textarea
                  value={formData.cons}
                  onChange={(e) => handleChange('cons', e.target.value)}
                  rows={3}
                  placeholder="Pricey&#10;Limited flavors"
                  className={textareaStyle}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGenerateProsCons}
                disabled={aiLoading.prosCons}
                className="text-xs text-peach hover:text-peach/80 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-peach/20 hover:bg-peach/5 transition-all disabled:opacity-50"
              >
                {aiLoading.prosCons ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                AI 一键生成优缺点
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-deep-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-peach" />
              其他信息
            </h3>
            <div>
              <label className={labelStyle}>扩展属性 (JSON)</label>
              <textarea
                value={formData.extra_attrs}
                onChange={(e) => handleChange('extra_attrs', e.target.value)}
                rows={3}
                placeholder='{"origin": "France", "shelf_life": "18 months"}'
                className={textareaStyle + ' font-mono text-xs'}
              />
            </div>

            <div>
              <label className={labelStyle}>图片 URL (每行一个)</label>
              <textarea
                value={formData.image_urls}
                onChange={(e) => handleChange('image_urls', e.target.value)}
                rows={3}
                placeholder="https://..."
                className={textareaStyle}
              />
            </div>

            <div>
              <label className={labelStyle}>状态</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className={inputStyle}
              >
                <option value="active">上架</option>
                <option value="inactive">下架</option>
                <option value="draft">草稿</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-peach/10 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm text-carbon bg-white/50 border border-peach/10 rounded-pill hover:bg-white transition-all"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 text-sm text-white bg-peach rounded-pill pill-button flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
