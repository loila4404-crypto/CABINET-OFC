'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
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

      setShowRegisterModal(false)
      router.push('/login?registered=true')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Декоративные 3D элементы фона */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cursor-primary opacity-10 rounded-full blur-3xl decorative-3d"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cursor-accent opacity-10 rounded-full blur-3xl decorative-3d" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cursor-secondary opacity-5 rounded-full blur-3xl decorative-3d" style={{ animationDelay: '4s' }}></div>
        
        {/* Геометрические 3D формы */}
        <div className="absolute top-20 right-20 w-32 h-32 geometric-3d opacity-5">
          <div className="w-full h-full bg-gradient-cursor rounded-lg" style={{ transform: 'rotateX(45deg) rotateY(45deg)' }}></div>
        </div>
        <div className="absolute bottom-20 left-20 w-24 h-24 geometric-3d opacity-5" style={{ animationDuration: '15s' }}>
          <div className="w-full h-full bg-gradient-cursor rounded-full" style={{ transform: 'rotateX(60deg)' }}></div>
        </div>
      </div>

      <div className="text-center relative z-10">
        <div className="mb-8">
          <h1 className="text-6xl font-bold mb-4 gradient-text">
            Cabinet
          </h1>
          <div className="w-24 h-1 bg-gradient-cursor mx-auto rounded-full mb-6"></div>
        </div>
        <p className="text-xl mb-12 text-cursor-text-muted max-w-2xl mx-auto">
          Управление и статистика ваших аккаунтов Reddit
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-4 bg-gradient-cursor text-white rounded-xl font-semibold btn-cursor btn-3d relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-5 h-5 icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Войти
            </span>
          </Link>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-8 py-4 bg-cursor-light border border-cursor-border text-cursor-text rounded-xl hover:bg-cursor-lighter hover:border-cursor-primary transition-all duration-300 font-semibold btn-3d relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-5 h-5 icon-3d" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Регистрация
            </span>
          </button>
        </div>
      </div>

      {/* Модальное окно регистрации */}
      {showRegisterModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowRegisterModal(false)
            setEmail('')
            setPassword('')
            setConfirmPassword('')
            setError('')
          }}
        >
          <div
            className="glass rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-cursor-glow-lg modal-3d"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold gradient-text">
                Регистрация
              </h2>
              <button
                onClick={() => {
                  setShowRegisterModal(false)
                  setEmail('')
                  setPassword('')
                  setConfirmPassword('')
                  setError('')
                }}
                className="text-cursor-text-muted hover:text-cursor-text text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-lg close-btn-3d"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block mb-2 text-cursor-text font-medium">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 transition input-3d"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block mb-2 text-cursor-text font-medium">Пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 transition input-3d"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block mb-2 text-cursor-text font-medium">
                  Подтвердите пароль
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-cursor-dark border border-cursor-border rounded-xl text-cursor-text focus:outline-none focus:border-cursor-primary focus:ring-2 focus:ring-cursor-primary/20 transition input-3d"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-cursor text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold btn-cursor btn-3d relative overflow-hidden"
                >
                  {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterModal(false)
                    setEmail('')
                    setPassword('')
                    setConfirmPassword('')
                    setError('')
                  }}
                  className="px-6 py-3 bg-cursor-light border border-cursor-border text-cursor-text rounded-xl hover:bg-cursor-lighter transition"
                >
                  Отмена
                </button>
              </div>
            </form>

            <p className="mt-6 text-center text-cursor-text-muted">
              Уже есть аккаунт?{' '}
              <Link
                href="/login"
                className="text-cursor-primary hover:text-cursor-secondary transition font-medium"
                onClick={() => setShowRegisterModal(false)}
              >
                Войти
              </Link>
            </p>
          </div>
        </div>
      )}
    </main>
  )
}

