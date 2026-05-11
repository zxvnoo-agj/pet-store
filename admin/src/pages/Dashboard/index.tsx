export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold">宠物用品助手管理后台</h1>
      </nav>
      <div className="p-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500">商品总数</h3>
            <p className="text-3xl font-bold">500</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500">用户总数</h3>
            <p className="text-3xl font-bold">1,000</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-500">待审核评价</h3>
            <p className="text-3xl font-bold">23</p>
          </div>
        </div>
      </div>
    </div>
  )
}
