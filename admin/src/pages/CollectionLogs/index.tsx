import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, Eye } from 'lucide-react'
import { adminCollectApi } from '../../services/api'
import Sidebar from '../../components/Sidebar'

interface Job {
  id: number
  data_source_name: string | null
  job_type: string
  collection_type: string
  status: string
  product_id: number | null
  params: any
  result: any
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

const jobStatusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

const jobStatusLabels: Record<string, string> = {
  pending: '待执行',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
}

export default function CollectionLogs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [failedCount, setFailedCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [jobTypeFilter, setJobTypeFilter] = useState('')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const params: any = { page }
      if (statusFilter) params.status = statusFilter
      if (jobTypeFilter) params.job_type = jobTypeFilter
      const resp = await adminCollectApi.listJobs(params)
      setJobs(resp.data.data.items)
      setFailedCount(resp.data.data.failed_count)
      setTotalPages(Math.ceil(resp.data.data.total / 20))
    } catch (e) {
      console.error('Failed to fetch jobs', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchJobs() }, [page, statusFilter, jobTypeFilter])

  const handleRetry = async (id: number) => {
    try {
      await adminCollectApi.retryJob(id)
      fetchJobs()
    } catch (e) {
      console.error('Retry job failed', e)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-gray/30 via-white to-rose-gray/20">
      <Sidebar />
      <main className="ml-[260px] min-h-screen p-8">
        <div className="page-enter max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-5 bg-peach rounded-full" />
                <h1 className="font-serif-display text-2xl font-bold text-deep-black">采集日志</h1>
                {failedCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">{failedCount} 条失败</span>
                )}
              </div>
              <p className="text-sm text-carbon/60 ml-3">查看采集任务执行记录，重试失败任务</p>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <div className="flex gap-2">
              {['', 'pending', 'running', 'completed', 'failed'].map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1) }}
                  className={`px-4 py-1.5 rounded-pill text-sm transition-all ${
                    statusFilter === s ? 'bg-peach text-white' : 'bg-white/60 text-carbon/70 hover:bg-peach/10'
                  }`}
                >
                  {s ? jobStatusLabels[s] : '全部'}
                </button>
              ))}
            </div>
            <select
              value={jobTypeFilter}
              onChange={(e) => { setJobTypeFilter(e.target.value); setPage(1) }}
              className="ml-4 px-3 py-1.5 rounded-pill bg-white/60 text-sm text-carbon/70 border border-white/30"
            >
              <option value="">全部类型</option>
              <option value="discovery">自动发现</option>
              <option value="price">价格更新</option>
              <option value="review">评价采集</option>
            </select>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/30 text-xs text-carbon/60 uppercase tracking-wider">
                  <th className="text-left px-6 py-4 font-medium">ID</th>
                  <th className="text-left px-6 py-4 font-medium">数据源</th>
                  <th className="text-left px-6 py-4 font-medium">类型</th>
                  <th className="text-left px-6 py-4 font-medium">状态</th>
                  <th className="text-left px-6 py-4 font-medium">开始时间</th>
                  <th className="text-left px-6 py-4 font-medium">完成时间</th>
                  <th className="text-right px-6 py-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-peach" /></td></tr>
                ) : jobs.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-carbon/40 text-sm">暂无采集记录</td></tr>
                ) : jobs.map((job) => (
                  <tr key={job.id} className="border-b border-white/20 hover:bg-white/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-deep-black">{job.id}</td>
                    <td className="px-6 py-4 text-sm text-carbon/70">{job.data_source_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-carbon/70">{job.job_type}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${jobStatusColors[job.status] || 'bg-gray-100'}`}>
                        {jobStatusLabels[job.status] || job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-carbon/60">{job.started_at ? new Date(job.started_at).toLocaleString() : '-'}</td>
                    <td className="px-6 py-4 text-sm text-carbon/60">{job.completed_at ? new Date(job.completed_at).toLocaleString() : '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedJob(job)} className="inline-flex items-center gap-1 text-sm text-peach hover:text-peach/80">
                          <Eye className="w-3.5 h-3.5" /> 详情
                        </button>
                        {job.status === 'failed' && (
                          <button onClick={() => handleRetry(job.id)} className="inline-flex items-center gap-1 text-sm text-peach hover:text-peach/80">
                            <RefreshCw className="w-3.5 h-3.5" /> 重试
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                    page === p ? 'bg-peach text-white' : 'text-carbon/60 hover:bg-peach/10'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedJob && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center" onClick={() => setSelectedJob(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif-display text-lg font-semibold text-deep-black mb-4">采集任务详情 #{selectedJob.id}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-carbon/60">数据源:</span><span>{selectedJob.data_source_name || '-'}</span></div>
              <div className="flex justify-between"><span className="text-carbon/60">任务类型:</span><span>{selectedJob.job_type}</span></div>
              <div className="flex justify-between"><span className="text-carbon/60">采集方式:</span><span>{selectedJob.collection_type}</span></div>
              <div className="flex justify-between"><span className="text-carbon/60">状态:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${jobStatusColors[selectedJob.status]}`}>
                  {jobStatusLabels[selectedJob.status] || selectedJob.status}
                </span>
              </div>
              {selectedJob.result && (
                <div><span className="text-carbon/60">执行结果:</span>
                  <pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(selectedJob.result, null, 2)}</pre>
                </div>
              )}
              {selectedJob.error_message && (
                <div><span className="text-red-500">错误信息:</span>
                  <pre className="mt-1 bg-red-50 p-2 rounded text-xs text-red-600 overflow-auto">{selectedJob.error_message}</pre>
                </div>
              )}
              <div className="flex justify-between"><span className="text-carbon/60">创建时间:</span><span>{selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleString() : '-'}</span></div>
            </div>
            <button onClick={() => setSelectedJob(null)} className="mt-6 w-full py-2.5 bg-peach text-white rounded-pill text-sm hover:bg-peach/90">关闭</button>
          </div>
        </div>
      )}
    </div>
  )
}
