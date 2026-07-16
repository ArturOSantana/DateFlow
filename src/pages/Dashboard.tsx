import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CheckCircle2, Clock, Plus, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { formatDateLabel, formatDateShort, isDatePast } from '../lib/utils'
import StatusBadge from '../components/StatusBadge'

export default function Dashboard() {
  const { user } = useAuth()
  const { dates, loading } = useApp()
  const navigate = useNavigate()

  const now = new Date()

  const upcoming = useMemo(
    () =>
      dates
        .filter(d => d.status === 'confirmed' && !isDatePast(d.date, d.time))
        .slice(0, 1),
    [dates],
  )

  const totalDone = useMemo(
    () => dates.filter(d => d.status === 'done').length,
    [dates],
  )

  const pendingTasks = useMemo(
    () =>
      dates
        .filter(d => d.status === 'confirmed')
        .flatMap(d => d.checklist)
        .filter(t => !t.done).length,
    [dates],
  )

  const firstName = user?.displayName?.split(' ')[0] ?? 'você'

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-stone-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-5 md:p-7 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-stone-900">
          Olá, {firstName}
        </h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-2xl font-semibold text-stone-900">{dates.filter(d => d.status === 'confirmed').length}</p>
          <p className="text-xs text-stone-500 mt-0.5">Confirmados</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-stone-900">{totalDone}</p>
          <p className="text-xs text-stone-500 mt-0.5">Realizados</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold text-stone-900">{pendingTasks}</p>
          <p className="text-xs text-stone-500 mt-0.5">Tarefas</p>
        </div>
      </div>

      {/* Next date */}
      <div className="mb-6">
        <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
          Próximo encontro
        </h2>
        {upcoming.length > 0 ? (
          <button
            onClick={() => navigate(`/dates/${upcoming[0].id}`)}
            className="card w-full text-left p-4 hover:border-stone-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-stone-900 truncate">{upcoming[0].title}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={12} />
                    {formatDateLabel(upcoming[0].date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {upcoming[0].time}
                  </span>
                </div>
                {upcoming[0].location && (
                  <p className="text-xs text-stone-400 mt-1 truncate">{upcoming[0].location}</p>
                )}
              </div>
              <ArrowRight size={15} className="text-stone-400 shrink-0 mt-0.5" />
            </div>
            {upcoming[0].checklist.length > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-100">
                <p className="text-xs text-stone-500">
                  <CheckCircle2 size={11} className="inline mr-1 text-emerald-500" />
                  {upcoming[0].checklist.filter(t => t.done).length}/{upcoming[0].checklist.length} tarefas concluídas
                </p>
              </div>
            )}
          </button>
        ) : (
          <div className="card p-5 text-center">
            <p className="text-sm text-stone-500">Nenhum date confirmado.</p>
            <button
              onClick={() => navigate('/dates/new')}
              className="btn-primary mt-3 mx-auto"
            >
              <Plus size={14} />
              Criar agora
            </button>
          </div>
        )}
      </div>

      {/* Recent */}
      {dates.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Recentes
            </h2>
            <button
              onClick={() => navigate('/dates')}
              className="text-xs text-ember-600 hover:text-ember-700 font-medium"
            >
              Ver todos
            </button>
          </div>
          <div className="space-y-2">
            {dates.slice(0, 4).map(d => (
              <button
                key={d.id}
                onClick={() => navigate(`/dates/${d.id}`)}
                className="card w-full text-left px-4 py-3 hover:border-stone-300 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{d.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{formatDateShort(d.date)} · {d.time}</p>
                </div>
                <StatusBadge status={d.status} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
