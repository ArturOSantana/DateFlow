import { useState } from 'react'
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
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'

const navItems = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/dates',   icon: CalendarDays,    label: 'Meus Dates' },
  { to: '/ideas',   icon: Lightbulb,       label: 'Ideias'     },
  { to: '/history', icon: History,         label: 'Histórico'  },
  { to: '/finance', icon: Wallet,          label: 'Finanças'   },
  { to: '/profile', icon: User,            label: 'Perfil'     },
]

/** Conteúdo compartilhado entre sidebar desktop e drawer mobile */
function NavContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function go(path: string) {
    navigate(path)
    onClose?.()
  }

  return (
    <>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item'}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <button
          onClick={() => go('/dates/new')}
          className="btn-primary w-full justify-center"
        >
          <Plus size={15} />
          Novo Date
        </button>
      </div>

      <div className="px-3 py-3 border-t border-stone-200">
        <div className="flex items-center gap-2 mb-2">
          {user?.photoURL
            ? <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
            : (
              <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-xs text-stone-600">
                {user?.displayName?.[0]}
              </div>
            )
          }
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-stone-900 truncate">{user?.displayName}</p>
            <p className="text-xs text-stone-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={async () => { await logout(); onClose?.() }}
          className="btn-ghost w-full text-stone-500 text-xs"
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </>
  )
}

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      {/* ══ DESKTOP: sidebar fixo, só visível em md+ ══ */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 bg-stone-50 border-r border-stone-200 flex-col z-20">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-ember-600 fill-ember-600" />
            <span className="font-semibold text-stone-900 tracking-tight flex-1">DateFlow</span>
            <NotificationBell />
          </div>
          <p className="text-xs text-stone-400 mt-0.5 ml-6">Planeje sem complicação</p>
        </div>
        <NavContent />
      </aside>

      {/* ══ MOBILE: topbar com botão hambúrguer ══ */}
      <header className="fixed top-0 inset-x-0 h-12 bg-stone-50 border-b border-stone-200 flex items-center px-3 gap-2 z-30 md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={20} className="text-stone-700" />
        </button>
        <Heart size={15} className="text-ember-600 fill-ember-600" />
        <span className="font-semibold text-stone-900 text-sm tracking-tight flex-1">DateFlow</span>
        <NotificationBell />
      </header>

      {/* ══ MOBILE: overlay ══ */}
      <div
        className={[
          'fixed inset-0 bg-black/40 z-40 md:hidden',
          'transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={close}
        aria-hidden="true"
      />

      {/* ══ MOBILE: drawer lateral ══ */}
      <div
        className={[
          'fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-stone-50 shadow-xl z-50',
          'flex flex-col md:hidden',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Cabeçalho do drawer */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-ember-600 fill-ember-600" />
            <span className="font-semibold text-stone-900 text-sm tracking-tight">DateFlow</span>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Fechar menu"
          >
            <X size={18} className="text-stone-600" />
          </button>
        </div>

        <NavContent onClose={close} />
      </div>
    </>
  )
}
