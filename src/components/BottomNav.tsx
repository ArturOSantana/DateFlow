import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Lightbulb,
  Users,
  User,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { getPronouns } from '../lib/gender'
import { getPendingInviteCount } from '../lib/db'

export default function BottomNav() {
  const { user } = useAuth()
  const { partnerGender } = useApp()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!user?.email) return
    let cancelled = false
    getPendingInviteCount(user.email).then(n => { if (!cancelled) setPendingCount(n) })
    const interval = setInterval(() => {
      getPendingInviteCount(user.email!).then(n => { if (!cancelled) setPendingCount(n) })
    }, 60_000)
    window.addEventListener('focus', () =>
      getPendingInviteCount(user.email!).then(n => { if (!cancelled) setPendingCount(n) })
    )
    return () => { cancelled = true; clearInterval(interval) }
  }, [user])

  const pg = getPronouns(partnerGender)

  const items = [
    { to: '/',        icon: LayoutDashboard, label: 'Dashboard'     },
    { to: '/dates',   icon: CalendarDays,    label: 'Dates'         },
    { to: '/ideas',   icon: Lightbulb,       label: 'Ideias'        },
    { to: '/partner', icon: Users,           label: pg.Partner, badge: pendingCount },
    { to: '/profile', icon: User,            label: 'Perfil'        },
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-stone-200 flex items-center z-20 md:hidden">
      {items.map(({ to, icon: Icon, label, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-semibold transition-all ${
              isActive ? 'text-ember-600' : 'text-stone-400'
            }`
          }
        >
          <span className="relative">
            <Icon size={18} />
            {badge != null && badge > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold leading-none flex items-center justify-center rounded-full px-[3px]">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </span>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
