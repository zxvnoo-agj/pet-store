import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAuthApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { PawPrint, Loader2 } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setToken, setUser } = useAuthStore()
  const containerRef = useRef<HTMLDivElement>(null)

  const particles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 20 + 15,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.3 + 0.1,
    }))
  )

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await adminAuthApi.login(username, password)
      const { token, user } = response.data.data
      setToken(token)
      setUser(user)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20"
          style={{
            background:
              'radial-gradient(circle, #E8A1A3 0%, #f3e7e6 30%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'pulse 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-10"
          style={{
            background:
              'radial-gradient(circle, #f3e7e6 0%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'float 10s ease-in-out infinite',
          }}
        />

        {particles.current.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-peach/30"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              animation: `float ${p.speed}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 perspective-[1200px]">
        <div
          className="absolute -top-6 -left-6 w-full h-full rounded-2xl opacity-30"
          style={{
            background: 'linear-gradient(135deg, #E8A1A3, #f3e7e6)',
            transform: 'rotateY(-5deg) rotateX(3deg) translateZ(-40px)',
            filter: 'blur(2px)',
          }}
        />

        <div
          className="absolute -top-3 -left-3 w-full h-full rounded-2xl opacity-50"
          style={{
            background: 'linear-gradient(135deg, #E8A1A3, #ffffff)',
            transform: 'rotateY(-2deg) rotateX(1deg) translateZ(-20px)',
            filter: 'blur(1px)',
          }}
        />

        <div
          className="relative w-[420px] rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow:
              '0 25px 80px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            transform: 'rotateY(2deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="h-1 w-full bg-gradient-to-r from-peach via-rose-gray to-peach" />

          <div className="px-10 py-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-peach/20 to-peach/5 mb-5 border border-peach/20">
                <PawPrint className="w-8 h-8 text-peach" />
              </div>
              <h1 className="font-serif-display text-3xl font-bold text-white mb-2 tracking-tight">
                宠爱之选
              </h1>
              <p className="text-sm text-white/40 tracking-widest uppercase font-light">
                Premium Pet Supply Distribution
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-peach/50 focus:bg-white/10 transition-all duration-300"
                  required
                />
              </div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-peach/50 focus:bg-white/10 transition-all duration-300"
                  required
                />
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-400 text-xs text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-peach to-[#d48a8c] text-white rounded-2xl font-medium text-sm tracking-wide pill-button flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </button>
            </form>

            <p className="text-center text-white/20 text-xs mt-8">
              宠物用品分销管理系统
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
