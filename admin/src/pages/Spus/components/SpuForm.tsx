import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { useSpuStore } from '../../../stores/spuStore'
import { useToastStore } from '../../../stores/toastStore'
import { adminCategoryApi } from '../../../services/api'

interface Category {
  id: number
  name: string
  pet_type: string
}

interface SpuFormProps {
  spu?: any
  onClose: () => void
  onSaved: () => void
}

export default function SpuForm({ spu, onClose, onSaved }: SpuFormProps) {
  const { createSpu, updateSpu } = useSpuStore()
  const { addToast } = useToastStore()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
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

  const fetchCategories = async () => {
    try {
      const res = await adminCategoryApi.list()
      console.log('[SpuForm] categories API response:', res.data)
      const data = res.data?.data
      if (Array.isArray(data)) {
        setCategories(data)
      } else if (Array.isArray(data?.items)) {
        setCategories(data.items)
      } else if (Array.isArray(res.data)) {
        setCategories(res.data)
      } else {
        setCategories([])
      }
    } catch (err) {
      console.error('Failed to fetch categories', err)
      setCategories([])
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-peach/10">
          <h2 className="text-lg font-semibold text-deep-black">
            {spu?.id ? '编辑 SPU' : '新建 SPU'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-peach/10 transition-all">
            <X className="w-5 h-5 text-carbon" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-carbon mb-1.5">分类 *</label>
              <select
                value={formData.category_id}
                onChange={(e) => handleChange('category_id', e.target.value)}
                className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40"
              >
                <option value="">选择分类</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-carbon mb-1.5">宠物类型 *</label>
              <select
                value={formData.pet_type}
                onChange={(e) => handleChange('pet_type', e.target.value)}
                className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40"
              >
                <option value="cat">猫咪</option>
                <option value="dog">狗狗</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-carbon mb-1.5">品牌 *</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                placeholder="如: Royal Canin"
                className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-carbon mb-1.5">型号 *</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="如: K36 2kg"
                className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-carbon mb-1.5">商品名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="如: Indoor Adult Cat Food"
              className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-carbon mb-1.5">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              placeholder="商品详细描述..."
              className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-carbon mb-1.5">成分 (每行一个)</label>
              <textarea
                value={formData.ingredients}
                onChange={(e) => handleChange('ingredients', e.target.value)}
                rows={4}
                placeholder="Chicken&#10;Rice&#10;Corn"
                className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-carbon mb-1.5">营养成分 (JSON)</label>
              <textarea
                value={formData.nutrition}
                onChange={(e) => handleChange('nutrition', e.target.value)}
                rows={4}
                placeholder='{"protein": "32%", "fat": "15%"}'
                className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40 resize-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-carbon mb-1.5">优点 (每行一个)</label>
              <textarea
                value={formData.pros}
                onChange={(e) => handleChange('pros', e.target.value)}
                rows={3}
                placeholder="High protein&#10;Grain-free"
                className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-carbon mb-1.5">缺点 (每行一个)</label>
              <textarea
                value={formData.cons}
                onChange={(e) => handleChange('cons', e.target.value)}
                rows={3}
                placeholder="Pricey&#10;Limited flavors"
                className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40 resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-carbon mb-1.5">扩展属性 (JSON)</label>
            <textarea
              value={formData.extra_attrs}
              onChange={(e) => handleChange('extra_attrs', e.target.value)}
              rows={3}
              placeholder='{"origin": "France", "shelf_life": "18 months"}'
              className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40 resize-none font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-carbon mb-1.5">图片 URL (每行一个)</label>
            <textarea
              value={formData.image_urls}
              onChange={(e) => handleChange('image_urls', e.target.value)}
              rows={3}
              placeholder="https://..."
              className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-carbon mb-1.5">状态</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-xl text-sm focus:outline-none focus:border-peach/40"
            >
              <option value="active">上架</option>
              <option value="inactive">下架</option>
              <option value="draft">草稿</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-peach/10">
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
    </div>
  )
}
