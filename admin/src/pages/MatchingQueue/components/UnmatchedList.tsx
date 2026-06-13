import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Link, Eye, Search, ChevronDown } from 'lucide-react'
import { useSpuStore } from '../../../stores/spuStore'
import { spuApi } from '../../../services/spuApi'
import ListingDetailModal from '../../Spus/components/ListingDetailModal'

interface SpuOption {
  id: number
  brand: string
  name: string
}

function SpuSelect({ value, options, onChange }: { value: number | ''; options: SpuOption[]; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = search
    ? options.filter(o => `${o.brand} ${o.name} ${o.id}`.toLowerCase().includes(search.toLowerCase()))
    : options

  const selected = options.find(o => o.id === value)
  const label = selected
    ? [selected.brand, selected.name].filter(Boolean).join(' ')
    : ''

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative w-56 spu-select-container">
      <div
        className={`flex items-center justify-between gap-1 px-3 py-1.5 bg-white/50 border rounded-pill text-sm cursor-pointer ${
          open ? 'border-peach/40' : 'border-peach/10'
        }`}
        onClick={() => setOpen(!open)}
      >
        <span className={`truncate ${value ? 'text-deep-black' : 'text-carbon/40'}`}>
          {label || '选择 SPU...'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-carbon/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-peach/10 rounded-xl shadow-lg max-h-64 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-peach/5">
            <Search className="w-3.5 h-3.5 text-carbon/40 shrink-0" />
            <input
              type="text"
              placeholder="搜索 SPU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-sm text-deep-black placeholder:text-carbon/40 focus:outline-none bg-transparent"
              onKeyDown={e => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-carbon/40 text-center">无匹配 SPU</div>
            ) : (
              filtered.map(spu => (
                <div
                  key={spu.id}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-peach/5 transition-colors ${
                    spu.id === value ? 'bg-peach/10 text-peach font-medium' : 'text-deep-black'
                  }`}
                  onClick={() => { onChange(spu.id); setOpen(false); setSearch('') }}
                >
                  {spu.brand && spu.name ? `${spu.brand} ${spu.name}` : spu.name || `SPU #${spu.id}`}
                  <span className="ml-2 text-xs text-carbon/40">#{spu.id}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function UnmatchedList() {
  const queueListings = useSpuStore((s) => s.queueListings)
  const fetchMatchingQueue = useSpuStore((s) => s.fetchMatchingQueue)
  const [spuSelections, setSpuSelections] = useState<Record<number, number>>({})
  const [linking, setLinking] = useState<Record<number, boolean>>({})
  const [detailListing, setDetailListing] = useState<typeof queueListings[0] | null>(null)
  const [spuOptions, setSpuOptions] = useState<SpuOption[]>([])

  useEffect(() => {
    const fetchAll = async () => {
      const all: SpuOption[] = []
      let page = 1
      while (true) {
        const res = await spuApi.list({ page, page_size: 100 })
        const items = res.data?.data?.items || []
        if (!items.length) break
        all.push(...items.map((s: any) => ({ id: s.id, brand: s.brand || '', name: s.name || '' })))
        if (items.length < 100) break
        page++
      }
      setSpuOptions(all)
    }
    fetchAll()
  }, [])

  const handleLink = async (listingId: number) => {
    const spuId = spuSelections[listingId]
    if (!spuId) return
    setLinking((prev) => ({ ...prev, [listingId]: true }))
    try {
      await spuApi.linkListing(listingId, { spu_id: spuId })
      fetchMatchingQueue({ tier: 'unmatched', page: 1, page_size: 20 })
    } catch (e) {
      console.error('Link failed', e)
    } finally {
      setLinking((prev) => ({ ...prev, [listingId]: false }))
    }
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-peach/10">
              <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">商品</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">平台 / 店铺</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">价格</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-carbon/60 uppercase tracking-wider">关联 SPU</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-carbon/60 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody>
            {queueListings.map((listing) => (
              <tr
                key={listing.id}
                className="border-b border-peach/5 hover:bg-white/30 transition-colors cursor-pointer"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('.spu-select-container, button, a')) return
                  setDetailListing(listing)
                }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {listing.image_url && (
                      <img src={listing.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <div>
                      <span className="text-sm text-deep-black font-medium truncate max-w-[240px] block">
                        {listing.title}
                      </span>
                      {listing.url && (
                        <a
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-peach hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <ExternalLink className="w-3 h-3" /> 查看链接
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 bg-peach/5 text-peach rounded-full">
                    {listing.platform}
                  </span>
                  <p className="text-xs text-carbon/50 mt-0.5">{listing.shop_name}</p>
                </td>
                <td className="px-4 py-3 text-sm text-deep-black font-medium">¥{listing.price}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <SpuSelect
                      value={spuSelections[listing.id] || ''}
                      options={spuOptions}
                      onChange={(v) => setSpuSelections(prev => ({ ...prev, [listing.id]: v }))}
                    />
                    <button
                      onClick={() => handleLink(listing.id)}
                      disabled={!spuSelections[listing.id] || linking[listing.id]}
                      className="p-1.5 rounded-lg text-peach hover:bg-peach/10 transition-colors disabled:opacity-40"
                      title="关联"
                    >
                      {linking[listing.id] ? (
                        <span className="inline-block w-4 h-4 border-2 border-peach border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Link className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setDetailListing(listing)}
                    className="p-1.5 rounded-lg text-carbon/40 hover:text-peach hover:bg-peach/10 transition-colors"
                    title="查看详情"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailListing && (
        <ListingDetailModal
          listing={detailListing}
          onClose={() => setDetailListing(null)}
        />
      )}
    </div>
  )
}
