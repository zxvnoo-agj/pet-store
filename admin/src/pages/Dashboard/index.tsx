import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function Dashboard() {
  const { logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">宠物用品助手管理后台</h1>
        <button
          onClick={logout}
          className="px-4 py-2 text-red-500 hover:text-red-700"
        >
          退出登录
        </button>
      </nav>
      <div className="p-6">
        <div className="grid grid-cols-3 gap-6 mb-8">
          <Link to="/products" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
            <h3 className="text-gray-500">商品管理</h3>
            <p className="text-3xl font-bold mt-2">管理商品</p>
          </Link>
          <Link to="/categories" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
            <h3 className="text-gray-500">分类管理</h3>
            <p className="text-3xl font-bold mt-2">管理分类</p>
          </Link>
          <Link to="/reviews" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
            <h3 className="text-gray-500">评价审核</h3>
            <p className="text-3xl font-bold mt-2">审核评价</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
