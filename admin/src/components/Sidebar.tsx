import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, FolderTree, MessageSquare, Database, Search, ClipboardList, LogOut, PawPrint } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

const menuItems = [
  { path: '/dashboard', label: '运营总览', icon: LayoutDashboard },
  { path: '/products', label: '商品管理', icon: Package },
  { path: '/categories', label: '分类管理', icon: FolderTree },
  { path: '/reviews', label: '评价审核', icon: MessageSquare },
  { path: '/collection', label: '商品采集', icon: Database },
  { path: '/strategies', label: '搜索策略', icon: Search },
  { path: '/collection-logs', label: '采集日志', icon: ClipboardList },
]

export default function Sidebar() {
  const location = useLocation()
  const { logout } = useAuthStore()

  return (
    <aside className="glass-sidebar fixed left-0 top-0 h-full w-[260px] flex flex-col z-50 border-r border-white/30">
      <div className="px-8 pt-8 pb-6">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-peach/20 flex items-center justify-center transition-transform group-hover:scale-105">
            <PawPrint className="w-5 h-5 text-peach" />
          </div>
          <div>
            <h1 className="font-serif-display text-lg font-semibold text-deep-black tracking-tight">
              宠爱之选
            </h1>
            <p className="text-[10px] text-carbon/60 tracking-widest uppercase">
              Premium Pet Supply
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-5 pt-4">
        <ul className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-5 py-3 rounded-pill transition-all duration-300 group ${
                    isActive
                      ? 'bg-peach text-white shadow-peach'
                      : 'text-carbon hover:bg-peach/10 hover:text-deep-black'
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] transition-transform duration-300 group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-carbon/60'
                    }`}
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-6 pb-4">
        <div className="h-px bg-gradient-to-r from-transparent via-peach/20 to-transparent mb-4" />
        <button
          onClick={logout}
          className="flex items-center gap-3 px-5 py-3 w-full rounded-pill text-carbon/70 hover:text-red-500 hover:bg-red-50 transition-all duration-300 group"
        >
          <LogOut className="w-[18px] h-[18px] transition-transform duration-300 group-hover:scale-110" />
          <span className="text-sm font-medium">退出登录</span>
        </button>
      </div>
    </aside>
  )
}
