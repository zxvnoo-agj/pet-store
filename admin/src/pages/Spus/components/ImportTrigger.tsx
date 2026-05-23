import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { spuApi } from '../../../services/spuApi'
import { useSpuStore } from '../../../stores/spuStore'

export default function ImportTrigger() {
  const [keyword, setKeyword] = useState('')
  const [maxResults, setMaxResults] = useState(100)
  const [platform, setPlatform] = useState('pdd_ddk')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setImportJob = useSpuStore((s) => s.setImportJob)
  const setImportStatus = useSpuStore((s) => s.setImportStatus)

  const handleImport = async () => {
    if (!keyword.trim()) {
      setError('请输入搜索关键词')
      return
    }

    setLoading(true)
    setError(null)
    setImportStatus('started')

    try {
      const res = await spuApi.importListings({
        keyword: keyword.trim(),
        max_results: maxResults,
        platform,
      })
      const jobId = res.data.data?.job_id
      if (jobId) {
        setImportJob(jobId)
        setImportStatus('running')
      }
    } catch (err: any) {
      setError(err.message || '导入失败')
      setImportStatus('failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card p-6 mb-6">
      <h3 className="font-medium text-deep-black mb-4">
        <Download className="w-4 h-4 inline mr-2 text-peach" />
        导入商品链接
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-carbon/60 mb-1.5">搜索关键词</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="例如：皇家猫粮、渴望狗粮..."
            className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-pill text-sm text-deep-black placeholder:text-carbon/40 focus:outline-none focus:border-peach/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-carbon/60 mb-1.5">最大数量</label>
            <input
              type="number"
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              min={10}
              max={500}
              className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-pill text-sm text-deep-black focus:outline-none focus:border-peach/40"
            />
          </div>
          <div>
            <label className="block text-xs text-carbon/60 mb-1.5">数据来源</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/50 border border-peach/10 rounded-pill text-sm text-deep-black focus:outline-none focus:border-peach/40"
            >
              <option value="pdd_ddk">拼多多 DDK</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</div>
        )}

        <button
          onClick={handleImport}
          disabled={loading}
          className="w-full px-6 py-3 bg-peach text-white rounded-pill text-sm font-medium pill-button flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> 导入中...</>
          ) : (
            <><Download className="w-4 h-4" /> 开始导入</>
          )}
        </button>
      </div>
    </div>
  )
}
