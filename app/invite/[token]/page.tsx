'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Invitation {
  id: string
  sender: {
    id: string
    email: string
  }
  receiver: {
    id: string
    email: string
  }
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canManageMembers: boolean
  status: string
  createdAt: string
}

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const loadInvitation = async () => {
      try {
        const response = await fetch(`/api/cabinet/invitations/${token}`)
        if (response.ok) {
          const data = await response.json()
          setInvitation(data)
        } else {
          const data = await response.json()
          setError(data.error || 'Приглашение не найдено')
        }
      } catch (err) {
        setError('Ошибка загрузки приглашения')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      loadInvitation()
    }
  }, [token])

  const handleAccept = async () => {
    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const userToken = localStorage.getItem('token')
      if (!userToken) {
        setError('Необходимо войти в систему')
        setTimeout(() => {
          router.push(`/login?redirect=/invite/${token}`)
        }, 2000)
        return
      }

      const response = await fetch(`/api/cabinet/invitations/${token}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Приглашение принято! Перенаправление...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setError(data.error || 'Ошибка принятия приглашения')
      }
    } catch (err) {
      setError('Ошибка принятия приглашения')
    } finally {
      setProcessing(false)
    }
  }

  const handleDecline = async () => {
    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const userToken = localStorage.getItem('token')
      if (!userToken) {
        setError('Необходимо войти в систему')
        return
      }

      const response = await fetch(`/api/cabinet/invitations/${token}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Приглашение отклонено')
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setError(data.error || 'Ошибка отклонения приглашения')
      }
    } catch (err) {
      setError('Ошибка отклонения приглашения')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cursor-dark via-cursor-darker to-cursor-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cursor-primary mx-auto mb-4"></div>
          <p className="text-cursor-text">Загрузка приглашения...</p>
        </div>
      </main>
    )
  }

  if (error && !invitation) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cursor-dark via-cursor-darker to-cursor-dark p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-red-400 text-5xl mb-4">✗</div>
          <h1 className="text-2xl font-bold gradient-text mb-4">Ошибка</h1>
          <p className="text-cursor-text-muted mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-gradient-cursor text-white rounded-xl font-semibold btn-3d"
          >
            Вернуться в кабинет
          </Link>
        </div>
      </main>
    )
  }

  if (!invitation) {
    return null
  }

  const isAccepted = invitation.status === 'accepted'
  const isDeclined = invitation.status === 'declined'
  const isPending = invitation.status === 'pending'

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cursor-dark via-cursor-darker to-cursor-dark p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-cursor flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
            {invitation.sender.email.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold gradient-text mb-2">
            Приглашение в кабинет
          </h1>
          <p className="text-cursor-text-muted">
            {invitation.sender.email} приглашает вас в свой кабинет
          </p>
        </div>

        {success && (
          <div className="mb-4 p-4 bg-green-600/20 border border-green-500/50 rounded-xl text-green-300 text-sm">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-600/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {isAccepted && (
          <div className="mb-6 p-4 bg-green-600/20 border border-green-500/50 rounded-xl">
            <p className="text-green-300 text-center font-medium">
              ✓ Приглашение уже принято
            </p>
          </div>
        )}

        {isDeclined && (
          <div className="mb-6 p-4 bg-red-600/20 border border-red-500/50 rounded-xl">
            <p className="text-red-300 text-center font-medium">
              ✗ Приглашение отклонено
            </p>
          </div>
        )}

        {isPending && (
          <>
            <div className="mb-6 p-4 bg-cursor-darker rounded-xl border border-cursor-border">
              <h3 className="text-cursor-text font-semibold mb-3">Права доступа:</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${invitation.canView ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                  <span className="text-cursor-text">Просмотр</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${invitation.canEdit ? 'bg-blue-500' : 'bg-gray-500'}`}></span>
                  <span className="text-cursor-text">Редактирование</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${invitation.canDelete ? 'bg-orange-500' : 'bg-gray-500'}`}></span>
                  <span className="text-cursor-text">Удаление</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${invitation.canManageMembers ? 'bg-purple-500' : 'bg-gray-500'}`}></span>
                  <span className="text-cursor-text">Управление участниками</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={processing}
                className="flex-1 px-6 py-3 bg-gradient-cursor text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed btn-3d"
              >
                {processing ? 'Обработка...' : 'Принять'}
              </button>
              <button
                onClick={handleDecline}
                disabled={processing}
                className="flex-1 px-6 py-3 bg-cursor-darker text-cursor-text rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed btn-3d"
              >
                Отклонить
              </button>
            </div>
          </>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="text-cursor-text-muted hover:text-cursor-text text-sm transition"
          >
            Вернуться в кабинет
          </Link>
        </div>
      </div>
    </main>
  )
}





