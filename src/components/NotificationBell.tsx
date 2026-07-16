import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPendingInviteCount } from '../lib/db'

/**
 * Sino de notificações. Mostra um badge vermelho com o número de convites
 * de parceria pendentes recebidos pelo usuário logado.
 * Ao clicar, navega para /partner.
 */
export default function NotificationBell({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user?.email) return

    let cancelled = false

    async function refresh() {
      const n = await getPendingInviteCount(user!.email!)
      if (!cancelled) setCount(n)
    }

    refresh()

    // Recarrega a cada 60s e toda vez que o usuário volta para a aba
    const interval = setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener('focus', refresh)
    }
  }, [user])

  function handleClick() {
    navigate('/partner')
    onNavigate?.()
  }

  return (
    <button
      onClick={handleClick}
      className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors"
      aria-label={count > 0 ? `${count} convite${count > 1 ? 's' : ''} pendente${count > 1 ? 's' : ''}` : 'Notificações'}
      title="Convites de parceria"
    >
      <Bell size={18} className="text-stone-600" />
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold leading-none flex items-center justify-center rounded-full px-[3px]">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}
