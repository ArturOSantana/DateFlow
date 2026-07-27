import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Lightbulb,
  Users,
  Popcorn,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { getPronouns } from '../lib/gender'
import { getPendingInviteCount } from '../lib/db'

export default function BottomNav() {
  const { user } = useAuth()
  const { partnerGender } = useApp()
  const [pendingCount, setPendingCount] = useState(0)
  const prevCountRef = useRef(0)
  const [badgeKey, setBadgeKey] = useState(0)

  useEffect(() => {
    if (!user?.email) return
    let cancelled = false

    async function fetchCount() {
      const n = await getPendingInviteCount(user!.email!)
      if (!cancelled) {
        if (n !== prevCountRef.current) {
          prevCountRef.current = n
          setBadgeKey(k => k + 1)
        }
        setPendingCount(n)
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    const onFocus = () => fetchCount()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [user])

  const pg = getPronouns(partnerGender)

  const items = [
    { to: '/',          icon: LayoutDashboard, label: 'Dashboard'              },
    { to: '/dates',     icon: CalendarDays,    label: 'Meus Dates'             },
    { to: '/watchlist', icon: Popcorn,         label: 'Filmes'                 },
    { to: '/ideas',     icon: Lightbulb,       label: 'Ideias'                 },
    { to: '/partner',   icon: Users,           label: pg.Partner, badge: pendingCount },
  ]

  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-white border-t border-[#F1EFE8] flex items-end z-20 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navegação inferior"
    >
      {items.map(({ to, icon: Icon, label, badge }) => {
        const hasBadge = typeof badge === 'number' && badge > 0
        const badgeText = badge != null && badge > 9 ? '9+' : String(badge)

        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            aria-label={hasBadge ? `${label} — ${badge} convite${badge === 1 ? '' : 's'} pendente${badge === 1 ? '' : 's'}` : label}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-end py-3 gap-0.5 transition-colors duration-150 ${
                isActive ? 'text-[#8A5CF6]' : 'text-[#5F5E5A] hover:text-[#2C2C2A]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <span className={`block transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  {isActive && (
                    <span
                      className="animate-tab-pip absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#8A5CF6]"
                      aria-hidden="true"
                    />
                  )}
                  {hasBadge && (
                    <span
                      key={badgeKey}
                      className="animate-badge-pop absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-[#FF6B8A] text-white text-[10px] font-bold leading-none flex items-center justify-center rounded-full px-[3px]"
                      aria-hidden="true"
                    >
                      {badgeText}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] leading-none mt-0.5 transition-all duration-150 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
