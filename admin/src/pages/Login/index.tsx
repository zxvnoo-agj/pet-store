export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-center mb-6">管理员登录</h1>
        <input
          type="text"
          placeholder="用户名"
          className="w-full p-3 border rounded mb-4"
        />
        <input
          type="password"
          placeholder="密码"
          className="w-full p-3 border rounded mb-6"
        />
        <button className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600">
          登录
        </button>
      </div>
    </div>
  )
}
