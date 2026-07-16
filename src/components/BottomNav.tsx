import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Lightbulb,
  Wallet,
  User,
} from 'lucide-react'

const navItems = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dates',   icon: CalendarDays,    label: 'Dates'     },
  { to: '/ideas',   icon: Lightbulb,       label: 'Ideias'    },
  { to: '/finance', icon: Wallet,          label: 'Finanças'  },
  { to: '/profile', icon: User,            label: 'Perfil'    },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-stone-50 border-t border-stone-200 flex items-center z-20 md:hidden">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
              isActive ? 'text-stone-900' : 'text-stone-400'
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
