'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка регистрации')
      }

      router.push('/login?registered=true')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Декоративные 3D элементы фона */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cursor-primary opacity-10 rounded-full blur-3xl decorative-3d"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cursor-accent opacity-10 rounded-full blur-3xl decorative-3d" style={{ animationDelay: '2s' }}></div>
        
        {/* Геометрические формы */}
        <div className="absolute top-20 right-20 w-32 h-32 geometric-3d opacity-5">
          <div className="w-full h-full bg-gradient-cursor rounded-lg" style={{ transform: 'rotateX(45deg) rotateY(45deg)' }}></div>
        </div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass rounded-2xl p-8 shadow-cursor-glow-lg modal-3d">
          <div className="text-center mb-8">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 icon-3d">
                <svg className="w-full h-full" fill="none" stroke="url(#gradient)" viewBox="0 0 24 24">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="50%" stopColor="#6366F1" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-3 gradient-text">
              Регистрация
            </h1>
            <div className="w-16 h-1 bg-gradient-cursor mx-auto rounded-full"></div>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block mb-2 text-cursor-text font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 transition input-3d"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block mb-2 text-cursor-text font-medium">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 transition input-3d"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block mb-2 text-cursor-text font-medium">
                Подтвердите пароль
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 transition input-3d"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-cursor btn-3d relative overflow-hidden mt-6"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Регистрация...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Зарегистрироваться
                  </>
                )}
              </span>
            </button>
          </form>

          <p className="mt-6 text-center text-cursor-text-muted">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-cursor-primary hover:text-cursor-secondary transition font-medium">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}






