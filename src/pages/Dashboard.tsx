import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CheckCircle2, Clock, Plus, ArrowRight, Heart } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { formatDateLabel, formatDateShort, isDatePast } from '../lib/utils'
import StatusBadge from '../components/StatusBadge'

export default function Dashboard() {
  const { user } = useAuth()
  const { dates, incomingDates, partnerName, loading } = useApp()
  const navigate = useNavigate()

  const now = new Date()

  // Próximo date: meus confirmados + os do parceiro confirmados, ordenados por data
  const nextDate = useMemo(() => {
    const mine = dates
      .filter(d => d.status === 'confirmed' && !isDatePast(d.date, d.time))
    const theirs = incomingDates
      .filter(d => d.status === 'confirmed' && !isDatePast(d.date, d.time))
    return [...mine, ...theirs].sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  }, [dates, incomingDates])

  const totalDone = useMemo(
    () => dates.filter(d => d.status === 'done').length
        + incomingDates.filter(d => d.status === 'done').length,
    [dates, incomingDates],
  )

  const pendingTasks = useMemo(
    () =>
      dates
        .filter(d => d.status === 'confirmed')
        .flatMap(d => d.checklist)
        .filter(t => !t.done).length,
    [dates],
  )

  const confirmedCount = useMemo(
    () => dates.filter(d => d.status === 'confirmed').length
        + incomingDates.filter(d => d.status === 'confirmed').length,
    [dates, incomingDates],
  )

  // Recentes: meus + incoming, ordenados por data desc (mais recente primeiro)
  const recent = useMemo(() => {
    const all = [
      ...dates.map(d => ({ ...d, _mine: true })),
      ...incomingDates.map(d => ({ ...d, _mine: false })),
    ].sort((a, b) => b.date.localeCompare(a.date))
    return all.slice(0, 5)
  }, [dates, incomingDates])

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

  const nextIsMine = nextDate ? nextDate.userId === user?.uid : true

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
          <p className="text-2xl font-semibold text-stone-900">{confirmedCount}</p>
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
        {nextDate ? (
          <button
            onClick={() =>
              nextIsMine
                ? navigate(`/dates/${nextDate.id}`)
                : navigate(`/partner/view/${nextDate.userId}`)
            }
            className="card w-full text-left p-4 hover:border-stone-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {!nextIsMine && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full mb-1">
                    <Heart size={9} className="fill-rose-500" />
                    {partnerName || 'Parceiro'} planejou
                  </span>
                )}
                <p className="font-medium text-stone-900 truncate">{nextDate.title}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={12} />
                    {formatDateLabel(nextDate.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {nextDate.time}
                  </span>
                </div>
                {nextDate.location && (
                  <p className="text-xs text-stone-400 mt-1 truncate">{nextDate.location}</p>
                )}
              </div>
              <ArrowRight size={15} className="text-stone-400 shrink-0 mt-0.5" />
            </div>
            {nextIsMine && nextDate.checklist.length > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-100">
                <p className="text-xs text-stone-500">
                  <CheckCircle2 size={11} className="inline mr-1 text-emerald-500" />
                  {nextDate.checklist.filter(t => t.done).length}/{nextDate.checklist.length} tarefas concluídas
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
      {recent.length > 0 && (
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
            {recent.map(d => {
              const isMine = d.userId === user?.uid
              return (
                <button
                  key={d.id}
                  onClick={() =>
                    isMine
                      ? navigate(`/dates/${d.id}`)
                      : navigate(`/partner/view/${d.userId}`)
                  }
                  className="card w-full text-left px-4 py-3 hover:border-stone-300 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    {!isMine && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full mb-0.5">
                        <Heart size={9} className="fill-rose-500" />
                        {partnerName || 'Parceiro'}
                      </span>
                    )}
                    <p className="text-sm font-medium text-stone-900 truncate">{d.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{formatDateShort(d.date)} · {d.time}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
