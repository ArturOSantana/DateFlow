import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
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
  Menu,
  X,
  Popcorn,
} from 'lucide-react'
import logoHorizontal from '../assets/dateflow-horizontal-v2.svg'
import logoIcon from '../assets/dateflow-icon-v2.svg'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { getPronouns } from '../lib/gender'
import NotificationBell from './NotificationBell'

// ─── Dados de navegação ──────────────────────────────────────────────────────

type NavItemDef = {
  to: string
  icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  label: string
}

function useNavItems(): NavItemDef[] {
  const { partnerGender } = useApp()
  const pg = getPronouns(partnerGender)
  return [
    { to: '/',          icon: LayoutDashboard, label: 'Dashboard'       },
    { to: '/dates',     icon: CalendarDays,    label: 'Meus Dates'      },
    { to: '/ideas',     icon: Lightbulb,       label: 'Ideias'          },
    { to: '/watchlist', icon: Popcorn,         label: 'Filmes & Séries' },
    { to: '/history',   icon: History,         label: 'Histórico'       },
    { to: '/finance',   icon: Wallet,          label: 'Finanças'        },
    { to: '/partner',   icon: Users,           label: pg.Partner        },
    { to: '/profile',   icon: User,            label: 'Perfil'          },
  ]
}

// ─── Avatar sem foto ─────────────────────────────────────────────────────────

function UserAvatar({ photoURL, displayName }: { photoURL?: string | null; displayName?: string | null }) {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt=""
        className="w-8 h-8 rounded-full ring-2 ring-[#F1EFE8] shrink-0"
      />
    )
  }
  const initials = displayName
    ? displayName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : '?'
  return (
    <div
      className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white select-none"
      style={{ background: 'linear-gradient(135deg, #FF6B8A 0%, #FF9E5E 50%, #8A5CF6 100%)' }}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

// ─── Conteúdo compartilhado (sidebar + drawer) ───────────────────────────────

function NavContent({
  onClose,
  firstFocusRef,
}: {
  onClose?: () => void
  firstFocusRef?: React.RefObject<HTMLButtonElement | null>
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = useNavItems()

  function go(path: string) {
    navigate(path)
    onClose?.()
  }

  return (
    <>
      {/* ── Navegação ── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto" aria-label="Navegação principal">
        {navItems.map(({ to, icon: Icon, label }, idx) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            aria-label={label}
            className={({ isActive }) => isActive ? 'nav-item-active animate-slide-in-left' : 'nav-item'}
            style={{ animationDelay: `${idx * 0.03}s` }}
          >
            {({ isActive }) => (
              <>
                <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Botão Novo Date ── */}
      <div className="px-3 pb-3">
        <button
          onClick={() => go('/dates/new')}
          className="btn-primary w-full justify-center"
          aria-label="Criar novo date"
        >
          <Plus size={16} aria-hidden="true" />
          Novo Date
        </button>
      </div>

      {/* ── Card do usuário ── */}
      <div className="px-3 py-3 border-t border-[#F1EFE8]">
        <div className="flex items-center gap-2.5">
          <UserAvatar photoURL={user?.photoURL} displayName={user?.displayName} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-[#2C2C2A] truncate leading-tight">
              {user?.displayName}
            </p>
            <p className="text-[13px] text-[#5F5E5A] truncate leading-tight">
              {user?.email}
            </p>
          </div>
          <button
            ref={firstFocusRef as React.RefObject<HTMLButtonElement>}
            onClick={async () => { await logout(); onClose?.() }}
            className="btn-ghost p-2 text-[#5F5E5A] shrink-0"
            aria-label="Sair da conta"
            title="Sair"
          >
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Drawer mobile com focus trap ────────────────────────────────────────────

function Drawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()

  // Fecha ao navegar
  useEffect(() => { onClose() }, [location.pathname])

  // Fecha com Esc
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen) return
    // Foca no botão fechar ao abrir
    requestAnimationFrame(() => closeBtnRef.current?.focus())

    function trapFocus(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !drawerRef.current) return
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => el.offsetParent !== null)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', trapFocus)
    return () => document.removeEventListener('keydown', trapFocus)
  }, [isOpen])

  // Scroll lock no body quando drawer aberto
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <>
      {/* Overlay */}
      <div
        className={[
          'fixed inset-0 z-40 md:hidden',
          'transition-opacity duration-200 linear',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        className={[
          'fixed inset-y-0 left-0 z-50 md:hidden',
          'w-[85vw] max-w-[272px]',
          'bg-white flex flex-col',
          'transition-transform',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{
          transitionDuration: isOpen ? '220ms' : '180ms',
          transitionTimingFunction: isOpen ? 'ease-out' : 'ease-in',
        }}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-[#F1EFE8] shrink-0">
          <img src={logoHorizontal} alt="DateFlow" className="h-6 object-contain" />
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-[12px] hover:bg-[#F1EFE8] transition-colors"
            aria-label="Fechar menu"
          >
            <X size={18} className="text-[#5F5E5A]" aria-hidden="true" />
          </button>
        </div>

        {/* Conteúdo de navegação — ordem de foco: nav items → Novo Date → card (Sair) */}
        <NavContent onClose={onClose} />
      </div>
    </>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  // Fecha drawer ao cruzar breakpoint md (≥ 768px)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    function handle(e: MediaQueryListEvent) {
      if (e.matches) setDrawerOpen(false)
    }
    mq.addEventListener('change', handle)
    return () => mq.removeEventListener('change', handle)
  }, [])

  // Devolve foco ao hambúrguer ao fechar
  function handleClose() {
    setDrawerOpen(false)
    requestAnimationFrame(() => hamburgerRef.current?.focus())
  }

  return (
    <>
      {/* ══ DESKTOP: sidebar fixa, só visível em md+ ══ */}
      <aside
        className="hidden md:flex fixed inset-y-0 left-0 w-56 bg-white border-r border-[#F1EFE8] flex-col z-20"
        aria-label="Navegação lateral"
      >
        {/* Header com logo + sino */}
        <div className="px-4 py-4 border-b border-[#F1EFE8] shrink-0">
          <div className="flex items-center justify-between gap-2">
            <img src={logoHorizontal} alt="DateFlow" className="h-6 object-contain" />
            <NotificationBell />
          </div>
        </div>
        <NavContent />
      </aside>

      {/* ══ MOBILE: topbar fixo ══ */}
      <header
        className="fixed top-0 inset-x-0 h-12 bg-white border-b border-[#F1EFE8] flex items-center px-2 z-30 md:hidden"
        aria-label="Barra de navegação superior"
      >
        <button
          ref={hamburgerRef}
          onClick={() => setDrawerOpen(true)}
          className="w-11 h-11 flex items-center justify-center rounded-[12px] hover:bg-[#F1EFE8] transition-colors"
          aria-label="Abrir menu"
          aria-expanded={drawerOpen}
          aria-controls="mobile-drawer"
        >
          <Menu size={20} className="text-[#2C2C2A]" aria-hidden="true" />
        </button>

        <div className="flex-1 flex justify-center">
          <img src={logoIcon} alt="DateFlow" className="h-7 w-7 object-contain" />
        </div>

        <NotificationBell />
      </header>

      {/* ══ MOBILE: drawer ══ */}
      <Drawer isOpen={drawerOpen} onClose={handleClose} />
    </>
  )
}
