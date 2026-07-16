
import { useNavigate } from 'react-router-dom'
import { LogOut, User, ChevronRight, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const { dates, ideas } = useApp()
  const navigate = useNavigate()

  const stats = [
    { label: 'Dates criados', value: dates.length },
    { label: 'Realizados', value: dates.filter(d => d.status === 'done').length },
    { label: 'Ideias salvas', value: ideas.length },
    { label: 'Favoritos', value: ideas.filter(i => i.favorite).length },
  ]

  return (
    <div className="p-5 md:p-7 max-w-lg">
      <h1 className="text-base font-semibold text-stone-900 mb-5">Perfil</h1>

      {/* User card */}
      <div className="card p-5 flex items-center gap-4 mb-6">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center">
            <User size={20} className="text-stone-500" />
          </div>
        )}
        <div>
          <p className="font-medium text-stone-900">{user?.displayName}</p>
          <p className="text-sm text-stone-500">{user?.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-2xl font-semibold text-stone-900">{s.value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="card divide-y divide-stone-100">
        <button
          onClick={() => navigate('/partner')}
          className="flex items-center justify-between w-full px-4 py-3.5 text-sm text-stone-700 hover:bg-stone-100 transition-colors rounded-t-xl"
        >
          <span className="flex items-center gap-2">
            <Users size={15} className="text-stone-400" />
            Acesso compartilhado
          </span>
          <ChevronRight size={14} className="text-stone-300" />
        </button>
        <button
          onClick={logout}
          className="flex items-center justify-between w-full px-4 py-3.5 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-b-xl"
        >
          <span className="flex items-center gap-2">
            <LogOut size={15} />
            Sair da conta
          </span>
          <ChevronRight size={14} className="text-stone-300" />
        </button>
      </div>
    </div>
  )
}
