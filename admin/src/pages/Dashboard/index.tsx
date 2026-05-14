import { Link } from 'react-router-dom'
import { Package, FolderTree, MessageSquare } from 'lucide-react'
import Sidebar from '../../components/Sidebar'

export default function Dashboard() {
  const cards = [
    {
      to: '/products',
      icon: Package,
      label: '商品管理',
      desc: '管理商品信息、库存状态与上架控制',
      gradient: 'from-peach/10 to-peach/5',
      iconColor: 'text-peach',
    },
    {
      to: '/categories',
      icon: FolderTree,
      label: '分类管理',
      desc: '管理商品分类体系，支持一级和二级分类',
      gradient: 'from-blue-50/80 to-blue-50/40',
      iconColor: 'text-blue-400',
    },
    {
      to: '/reviews',
      icon: MessageSquare,
      label: '评价审核',
      desc: '审核用户评价，维护社区内容质量',
      gradient: 'from-amber-50/80 to-amber-50/40',
      iconColor: 'text-amber-400',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-gray/30 via-white to-rose-gray/20">
      <Sidebar />
      <main className="ml-[260px] min-h-screen p-8">
        <div className="page-enter max-w-[1400px] mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-5 bg-peach rounded-full" />
              <h1 className="font-serif-display text-2xl font-bold text-deep-black">
                运营总览
              </h1>
            </div>
            <p className="text-sm text-carbon/60 ml-3">
              欢迎使用宠爱之选分销管理系统
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {cards.map((card) => {
              const Icon = card.icon
              return (
                <Link
                  key={card.to}
                  to={card.to}
                  className="glass-card p-6 group hover:shadow-glass-lg transition-all duration-500"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}
                    >
                      <Icon className={`w-6 h-6 ${card.iconColor}`} />
                    </div>
                  </div>
                  <h3 className="font-serif-display text-xl font-bold text-deep-black mb-1">
                    {card.label}
                  </h3>
                  <p className="text-sm text-carbon/60">
                    {card.desc}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
