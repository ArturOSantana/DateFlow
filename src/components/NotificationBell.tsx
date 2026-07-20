import React, { useEffect, useRef, useState } from 'react'
import { Bell, ThumbsUp, ThumbsDown, X, Check, Ban, CalendarClock, PartyPopper, Heart, HeartCrack, PenLine, Star, Plus, CalendarCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPendingInviteCount, getNotifications, markAllNotificationsRead } from '../lib/db'
import type { AppNotification, NotificationType } from '../types'

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
    if (dateId) navigate(`/dates/${dateId}`)
    else navigate('/partner')
    setOpen(false)
    onNavigate?.()
  }

  function goToPartner() {
    navigate('/partner')
    setOpen(false)
    onNavigate?.()
  }

  // Ícone e cor para cada tipo de notificação
  function getNotifStyle(type: NotificationType): { icon: React.ReactNode; bg: string } {
    switch (type) {
      case 'date_accepted':   return { icon: <ThumbsUp size={13} className="text-emerald-600" />, bg: 'bg-emerald-100' }
      case 'date_declined':   return { icon: <ThumbsDown size={13} className="text-red-500" />, bg: 'bg-red-100' }
      case 'date_cancelled':  return { icon: <Ban size={13} className="text-red-500" />, bg: 'bg-red-100' }
      case 'date_changed':    return { icon: <CalendarClock size={13} className="text-amber-600" />, bg: 'bg-amber-100' }
      case 'date_created':    return { icon: <Plus size={13} className="text-violet-600" />, bg: 'bg-violet-100' }
      case 'date_confirmed':  return { icon: <CalendarCheck size={13} className="text-emerald-600" />, bg: 'bg-emerald-100' }
      case 'date_done':       return { icon: <PartyPopper size={13} className="text-pink-500" />, bg: 'bg-pink-100' }
      case 'invite_accepted': return { icon: <Heart size={13} className="text-rose-500" />, bg: 'bg-rose-100' }
      case 'invite_rejected': return { icon: <HeartCrack size={13} className="text-stone-500" />, bg: 'bg-stone-100' }
      case 'partner_note':    return { icon: <PenLine size={13} className="text-blue-500" />, bg: 'bg-blue-100' }
      case 'partner_rated':   return { icon: <Star size={13} className="text-yellow-500" />, bg: 'bg-yellow-100' }
    }
  }

  // Texto da notificação para cada tipo
  function getNotifText(n: AppNotification): React.ReactNode {
    switch (n.type) {
      case 'date_accepted':
        return <><span className="font-medium">{n.fromName}</span><span className="text-emerald-700"> aceitou</span>{' o date '}<span className="font-medium">"{n.dateTitle}"</span></>
      case 'date_declined':
        return <><span className="font-medium">{n.fromName}</span><span className="text-red-600"> recusou</span>{' o date '}<span className="font-medium">"{n.dateTitle}"</span></>
      case 'date_cancelled':
        return <><span className="font-medium">{n.fromName}</span><span className="text-red-600"> cancelou</span>{' o date '}<span className="font-medium">"{n.dateTitle}"</span></>
      case 'date_changed':
        return <><span className="font-medium">{n.fromName}</span><span className="text-amber-700"> alterou</span>{' o date '}<span className="font-medium">"{n.dateTitle}"</span></>
      case 'date_created':
        return <><span className="font-medium">{n.fromName}</span>{' criou um novo date para vocês: '}<span className="font-medium">"{n.dateTitle}"</span></>
      case 'date_confirmed':
        return <><span className="font-medium">{n.fromName}</span><span className="text-emerald-700"> confirmou</span>{' o date '}<span className="font-medium">"{n.dateTitle}"</span></>
      case 'date_done':
        return <><span className="font-medium">{n.fromName}</span>{' marcou '}<span className="font-medium">"{n.dateTitle}"</span>{' como realizado 🎉'}</>
      case 'invite_accepted':
        return <><span className="font-medium">{n.fromName}</span><span className="text-rose-600"> aceitou</span>{' seu convite de parceria 💕'}</>
      case 'invite_rejected':
        return <><span className="font-medium">{n.fromName}</span>{' recusou seu convite de parceria'}</>
      case 'partner_note':
        return <><span className="font-medium">{n.fromName}</span>{' deixou uma observação em '}<span className="font-medium">"{n.dateTitle}"</span></>
      case 'partner_rated':
        return <><span className="font-medium">{n.fromName}</span>{' avaliou '}<span className="font-medium">"{n.dateTitle}"</span>{n.rating ? ` com ${'⭐'.repeat(n.rating)}` : ''}</>
    }
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
        <div className="absolute right-0 top-11 w-[min(320px,calc(100vw-1.5rem))] bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden">
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

            {/* Notificações */}
            {notifications.map(n => {
              const style = getNotifStyle(n.type)
              return (
                <button
                  key={n.id}
                  onClick={() => goToDate(n.dateId)}
                  className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors flex items-start gap-3 ${!n.read ? 'bg-stone-50/60' : ''}`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${style.bg}`}>
                    {style.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-stone-800 leading-snug">
                      {getNotifText(n)}
                    </p>
                    {(n.type === 'date_declined' || n.type === 'date_cancelled' || n.type === 'invite_rejected') && n.reason && (
                      <p className="text-xs text-stone-500 italic mt-0.5 truncate">"{n.reason}"</p>
                    )}
                    {(n.type === 'date_changed' || n.type === 'date_created' || n.type === 'date_confirmed') && (n.dateValue || n.timeValue) && (
                      <p className="text-xs text-stone-500 mt-0.5">
                        {[n.dateValue ? new Date(`${n.dateValue}T12:00:00`).toLocaleDateString('pt-BR') : null, n.timeValue ? `às ${n.timeValue}` : null].filter(Boolean).join(' ')}
                      </p>
                    )}
                    <p className="text-xs text-stone-400 mt-0.5">
                      {new Date(n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                  )}
                </button>
              )
            })}

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
