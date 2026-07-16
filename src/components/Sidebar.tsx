import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Plus,
  Lightbulb,
  History,
  Wallet,
  Users,
  User,
  LogOut,
  Heart,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { getPronouns } from '../lib/gender'
import NotificationBell from './NotificationBell'

/** Conteúdo compartilhado entre sidebar desktop e drawer mobile */
function NavContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth()
  const { partnerGender } = useApp()
  const navigate = useNavigate()
  const pg = getPronouns(partnerGender)

  const navItems = [
    { to: '/',        icon: LayoutDashboard, label: 'Dashboard'  },
    { to: '/dates',   icon: CalendarDays,    label: 'Meus Dates' },
    { to: '/ideas',   icon: Lightbulb,       label: 'Ideias'     },
    { to: '/history', icon: History,         label: 'Histórico'  },
    { to: '/finance', icon: Wallet,          label: 'Finanças'   },
    { to: '/partner', icon: Users,           label: pg.Partner   },
    { to: '/profile', icon: User,            label: 'Perfil'     },
  ]

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

      <div className="px-3 py-3 border-t border-stone-100">
        <div className="flex items-center gap-2.5 mb-2.5">
          {user?.photoURL
            ? <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full ring-2 ring-stone-200" />
            : (
              <div className="w-8 h-8 rounded-full bg-ember-100 flex items-center justify-center text-xs font-bold text-ember-700">
                {user?.displayName?.[0]}
              </div>
            )
          }
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-stone-900 truncate">{user?.displayName}</p>
            <p className="text-xs text-stone-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={async () => { await logout(); onClose?.() }}
          className="btn-ghost w-full text-stone-500 text-xs justify-center"
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
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 bg-white border-r border-stone-200 flex-col z-20">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-ember-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm shadow-ember-600/30">
              <Heart size={14} className="text-white fill-white" />
            </div>
            <span className="font-bold text-stone-900 tracking-tight flex-1">DateFlow</span>
            <NotificationBell />
          </div>
        </div>
        <NavContent />
      </aside>

      {/* ══ MOBILE: topbar com botão hambúrguer ══ */}
      <header className="fixed top-0 inset-x-0 h-12 bg-white border-b border-stone-200 flex items-center px-3 gap-2 z-30 md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={20} className="text-stone-700" />
        </button>
        <div className="w-6 h-6 bg-ember-600 rounded-lg flex items-center justify-center shrink-0">
          <Heart size={12} className="text-white fill-white" />
        </div>
        <span className="font-bold text-stone-900 text-sm tracking-tight flex-1">DateFlow</span>
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
        <div className="flex items-center justify-between px-4 h-12 border-b border-stone-200 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-ember-600 rounded-lg flex items-center justify-center shrink-0">
              <Heart size={12} className="text-white fill-white" />
            </div>
            <span className="font-bold text-stone-900 text-sm tracking-tight">DateFlow</span>
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
