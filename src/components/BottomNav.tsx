
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Lightbulb,
  Wallet,
  User,
  Plus,
  Heart,
} from 'lucide-react'

const navItems = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dates',   icon: CalendarDays,    label: 'Dates'     },
  { to: '/ideas',   icon: Lightbulb,       label: 'Ideias'    },
  { to: '/finance', icon: Wallet,          label: 'Finanças'  },
  { to: '/profile', icon: User,            label: 'Perfil'    },
]

export default function BottomNav() {
  const navigate = useNavigate()

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 h-12 bg-stone-50 border-b border-stone-200 flex items-center px-4 gap-2 z-20 md:hidden">
        <Heart size={16} className="text-ember-600 fill-ember-600" />
        <span className="font-semibold text-stone-900 text-sm tracking-tight">DateFlow</span>
        <div className="flex-1" />
        <button
          onClick={() => navigate('/dates/new')}
          className="btn-primary py-1.5 px-3 text-xs"
        >
          <Plus size={13} />
          Novo Date
        </button>
      </header>

      {/* Bottom nav */}
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
    </>
  )
}
