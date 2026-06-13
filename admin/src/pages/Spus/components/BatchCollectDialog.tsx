import { useState } from 'react'
import { X, Loader2, Link2, MessageSquareText } from 'lucide-react'
import { adminCollectApi, adminImportApi } from '../../../services/api'
import { useToastStore } from '../../../stores/toastStore'

interface Props {
  spus: any[]
  selectedIds: Set<number>
  onClose: () => void
}

export default function BatchCollectDialog({ spus, selectedIds, onClose }: Props) {
  const { addToast } = useToastStore()
  const [importLinks, setImportLinks] = useState(true)
  const [collectReviews, setCollectReviews] = useState(true)
  const [maxResults, setMaxResults] = useState(30)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const selectedSpus = spus.filter((s: any) => selectedIds.has(s.id))

  const handleConfirm = async () => {
    if (!importLinks && !collectReviews) return
    setRunning(true)
    const ids = Array.from(selectedIds)
    setProgress({ done: 0, total: ids.length * (Number(importLinks) + Number(collectReviews)) })

    let linkOk = 0
    let linkFail = 0
    let reviewOk = 0
    let reviewFail = 0

    for (const id of ids) {
      if (importLinks) {
        const spu = spus.find((s: any) => s.id === id)
        const keyword = spu ? [spu.brand, spu.name, spu.model].filter(Boolean).join(' ') : ''
        try {
          await adminImportApi.importForSpu(id, { keyword, max_results: maxResults, source: 'pdd' })
          linkOk++
        } catch {
          linkFail++
        }
        setProgress(p => ({ ...p, done: p.done + 1 }))
      }

      if (collectReviews) {
        try {
          await adminCollectApi.triggerXHSForSpu(id)
          reviewOk++
        } catch {
          reviewFail++
        }
        setProgress(p => ({ ...p, done: p.done + 1 }))
      }
    }

    const msgs: string[] = []
    if (importLinks) msgs.push(`导入链接 ${linkOk} 成功${linkFail ? `，${linkFail} 失败` : ''}`)
    if (collectReviews) msgs.push(`评论采集 ${reviewOk} 成功${reviewFail ? `，${reviewFail} 失败` : ''}`)
    addToast(msgs.join('；'), linkFail > 0 || reviewFail > 0 ? 'info' : 'success')
    setRunning(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-[480px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-deep-black">批量商品采集</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-carbon/40 hover:text-carbon hover:bg-gray-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-carbon/60">
            已选中 <span className="font-semibold text-deep-black">{selectedIds.size}</span> 个 SPU
          </p>

          <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            importLinks ? 'border-purple-300 bg-purple-50/50' : 'border-gray-100 bg-white hover:border-gray-200'
          }`}>
            <input type="checkbox" checked={importLinks} onChange={e => setImportLinks(e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-purple-500 focus:ring-purple-400" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-deep-black">导入链接</span>
              </div>
              <p className="text-xs text-carbon/50 mt-1">从电商平台搜索导入该 SPU 的商品链接，关键词默认使用品牌+名称+型号</p>

              {importLinks && (
                <div className="mt-3 pl-6 space-y-2">
                  <div>
                    <label className="block text-xs text-carbon/60 mb-1">最大数量</label>
                    <input
                      type="number"
                      value={maxResults}
                      onChange={e => setMaxResults(Math.max(1, Number(e.target.value)))}
                      min={1}
                      max={200}
                      className="w-24 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-carbon/60 mb-1">搜索关键词预览</label>
                    <div className="flex flex-wrap gap-1">
                      {selectedSpus.slice(0, 3).map((s: any) => (
                        <span key={s.id} className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-carbon/60 rounded-md truncate max-w-[200px]">
                          {[s.brand, s.name, s.model].filter(Boolean).join(' ')}
                        </span>
                      ))}
                      {selectedSpus.length > 3 && (
                        <span className="text-xs text-carbon/40 self-center">+{selectedSpus.length - 3} 更多</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </label>

          <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            collectReviews ? 'border-peach/40 bg-peach/5' : 'border-gray-100 bg-white hover:border-gray-200'
          }`}>
            <input type="checkbox" checked={collectReviews} onChange={e => setCollectReviews(e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-peach focus:ring-peach/30" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <MessageSquareText className="w-4 h-4 text-peach" />
                <span className="text-sm font-medium text-deep-black">商品采集评论</span>
              </div>
              <p className="text-xs text-carbon/50 mt-1">从小红书搜索采集该 SPU 的用户评论和笔记</p>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={running}
            className="px-5 py-2.5 text-sm text-carbon hover:text-deep-black transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={(!importLinks && !collectReviews) || running}
            className="px-6 py-2.5 text-sm text-white bg-purple-500 rounded-pill hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress.done}/{progress.total}
              </>
            ) : (
              '开始采集'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}