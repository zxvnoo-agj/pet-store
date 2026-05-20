import { useState } from 'react'
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
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">导入商品链接</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            搜索关键词
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="例如：猫粮、狗粮..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最大数量
            </label>
            <input
              type="number"
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              min={10}
              max={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              数据来源
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pdd_ddk">拼多多 DDK</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button
          onClick={handleImport}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '导入中...' : '开始导入'}
        </button>
      </div>
    </div>
  )
}
