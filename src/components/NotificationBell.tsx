import { useEffect, useRef, useState } from 'react'
import { Bell, ThumbsUp, ThumbsDown, X, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPendingInviteCount, getNotifications, markAllNotificationsRead } from '../lib/db'
import type { AppNotification } from '../types'
import { formatDate } from '../lib/utils'

/**
 * Sino de notificações. Mostra badge com:
 * - convites de parceria pendentes
 * - respostas do parceiro a dates (aceito/recusado)
 * Ao clicar abre um dropdown com a lista.
 */
export default function NotificationBell({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [pendingInvites, setPendingInvites] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  async function refresh() {
    if (!user?.email || !user?.uid) return
    const [invites, notifs] = await Promise.all([
      getPendingInviteCount(user.email),
      getNotifications(user.uid),
    ])
    setPendingInvites(invites)
    setNotifications(notifs)
    const unread = notifs.filter(n => !n.read).length
    setCount(invites + unread)
  }

  useEffect(() => {
    if (!user) return
    refresh()
    const interval = setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', refresh)
    }
  }, [user])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleOpen() {
    setOpen(o => !o)
    // Marca todas as notificações de date como lidas ao abrir
    if (!open && user?.uid && notifications.some(n => !n.read)) {
      await markAllNotificationsRead(user.uid)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setCount(pendingInvites)
    }
  }

  function goToDate(dateId: string) {
    navigate(`/dates/${dateId}`)
    setOpen(false)
    onNavigate?.()
  }

  function goToPartner() {
    navigate('/partner')
    setOpen(false)
    onNavigate?.()
  }

  const hasAny = count > 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors"
        aria-label={hasAny ? `${count} notificaç${count > 1 ? 'ões' : 'ão'} não lida${count > 1 ? 's' : ''}` : 'Notificações'}
        title="Notificações"
      >
        <Bell size={18} className="text-stone-600" />
        {hasAny && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold leading-none flex items-center justify-center rounded-full px-[3px]">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Notificações</p>
            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600">
              <X size={14} />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-stone-100">
            {/* Convites pendentes */}
            {pendingInvites > 0 && (
              <button
                onClick={goToPartner}
                className="w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors flex items-start gap-3"
              >
                <span className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell size={13} className="text-rose-500" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-stone-800 font-medium">
                    {pendingInvites} convite{pendingInvites > 1 ? 's' : ''} de parceria pendente{pendingInvites > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">Clique para ver</p>
                </div>
              </button>
            )}

            {/* Notificações de resposta */}
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => goToDate(n.dateId)}
                className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors flex items-start gap-3 ${!n.read ? 'bg-stone-50/60' : ''}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  n.type === 'date_accepted' ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
                  {n.type === 'date_accepted'
                    ? <ThumbsUp size={13} className="text-emerald-600" />
                    : <ThumbsDown size={13} className="text-red-500" />
                  }
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-stone-800 leading-snug">
                    <span className="font-medium">{n.fromName}</span>
                    {n.type === 'date_accepted'
                      ? <span className="text-emerald-700"> aceitou</span>
                      : <span className="text-red-600"> recusou</span>
                    }
                    {' o date '}
                    <span className="font-medium">"{n.dateTitle}"</span>
                  </p>
                  {n.type === 'date_declined' && n.reason && (
                    <p className="text-xs text-stone-500 italic mt-0.5 truncate">"{n.reason}"</p>
                  )}
                  <p className="text-xs text-stone-400 mt-0.5">
                    {new Date(n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                )}
              </button>
            ))}

            {pendingInvites === 0 && notifications.length === 0 && (
              <div className="px-4 py-6 text-center">
                <Check size={20} className="text-stone-300 mx-auto mb-2" />
                <p className="text-sm text-stone-400">Tudo em dia!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
