
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Plus,
  Lightbulb,
  History,
  Wallet,
  User,
  LogOut,
  Heart,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/dates',   icon: CalendarDays,    label: 'Meus Dates'  },
  { to: '/ideas',   icon: Lightbulb,       label: 'Ideias'      },
  { to: '/history', icon: History,         label: 'Histórico'   },
  { to: '/finance', icon: Wallet,          label: 'Finanças'    },
  { to: '/profile', icon: User,            label: 'Perfil'      },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-stone-50 border-r border-stone-200 flex flex-col z-20">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <Heart size={18} className="text-ember-600 fill-ember-600" />
          <span className="font-semibold text-stone-900 tracking-tight">DateFlow</span>
        </div>
        <p className="text-xs text-stone-400 mt-0.5 ml-6">Planeje sem complicação</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item'}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* New Date CTA */}
      <div className="px-3 pb-3">
        <button
          onClick={() => navigate('/dates/new')}
          className="btn-primary w-full justify-center"
        >
          <Plus size={15} />
          Novo Date
        </button>
      </div>

      {/* User */}
      <div className="px-3 py-3 border-t border-stone-200">
        <div className="flex items-center gap-2 mb-2">
          {user?.photoURL
            ? <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
            : <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-xs text-stone-600">{user?.displayName?.[0]}</div>
          }
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-stone-900 truncate">{user?.displayName}</p>
            <p className="text-xs text-stone-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="btn-ghost w-full text-stone-500 text-xs">
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </aside>
  )
}
