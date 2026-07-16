import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CalendarDays, List, Search, ChevronLeft, ChevronRight, Heart, User } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { formatDateLabel } from '../lib/utils'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { DateEvent } from '../types'

type ViewMode = 'list' | 'calendar'

export default function DatesPage() {
  const { dates, incomingDates, partnerName, loading } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [calMonth, setCalMonth] = useState(new Date())

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return dates.filter(
      d =>
        d.title.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q),
    )
  }, [dates, search])

  const filteredIncoming = useMemo(() => {
    const q = search.toLowerCase()
    return incomingDates.filter(
      d =>
        d.title.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q),
    )
  }, [incomingDates, search])

  // Para o calendário, combina todos os dates
  const allDates = useMemo(() => [...dates, ...incomingDates], [dates, incomingDates])
  const filteredAll = useMemo(() => {
    const q = search.toLowerCase()
    return allDates.filter(
      d =>
        d.title.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q),
    )
  }, [allDates, search])

  return (
    <div className="p-5 md:p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-stone-900">Dates</h1>
        <div className="flex items-center gap-2">
          {/* Toggle lista/calendário */}
          <div className="flex items-center bg-stone-100 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm text-ember-600' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`p-1.5 rounded-lg transition-all ${view === 'calendar' ? 'bg-white shadow-sm text-ember-600' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <CalendarDays size={15} />
            </button>
          </div>
          <button onClick={() => navigate('/dates/new')} className="btn-primary">
            <Plus size={14} />
            Novo
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          className="input pl-8"
          placeholder="Pesquisar por título ou local..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-stone-100 rounded-xl animate-pulse" />)}
        </div>
      ) : view === 'list' ? (
        <ListViewSplit
          myDates={filtered}
          theirDates={filteredIncoming}
          partnerName={partnerName}
          userId={user?.uid ?? ''}
        />
      ) : (
        <CalendarView
          dates={filteredAll}
          ownerId={user?.uid ?? ''}
          partnerName={partnerName}
          month={calMonth}
          onPrev={() => setCalMonth(m => subMonths(m, 1))}
          onNext={() => setCalMonth(m => addMonths(m, 1))}
        />
      )}
    </div>
  )
}

// ─── List View (dividida em seções) ──────────────────────────────────────────

function DateGroup({
  dates,
  ownerId,
  partnerName,
}: {
  dates: DateEvent[]
  ownerId: string
  partnerName: string
}) {
  const navigate = useNavigate()
  const groups: Record<string, DateEvent[]> = {}
  dates.forEach(d => {
    if (!groups[d.date]) groups[d.date] = []
    groups[d.date].push(d)
  })

  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([date, items]) => (
        <div key={date}>
          <p className="text-xs font-medium text-stone-500 mb-2 capitalize">
            {formatDateLabel(date)}
          </p>
          <div className="space-y-1.5">
            {items.map((d, idx) => {
              const isMine = d.userId === ownerId
              return (
                <button
                  key={d.id}
                  onClick={() =>
                    isMine
                      ? navigate(`/dates/${d.id}`)
                      : navigate(`/partner/view/${d.userId}`)
                  }
                  className="card w-full text-left px-4 py-3 hover:border-stone-300 hover:shadow-md hover:shadow-stone-900/[.06] transition-all active:scale-[.99] flex items-center justify-between gap-3 animate-slide-up"
                  style={{ animationDelay: `${idx * 0.04}s` }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {!isMine && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full shrink-0">
                          <Heart size={9} className="fill-rose-500" />
                          {partnerName || 'Parceiro'}
                        </span>
                      )}
                      <p className="text-sm font-medium text-stone-900 truncate">{d.title}</p>
                    </div>
                    <p className="text-xs text-stone-400">
                      {d.time}{d.location ? ` · ${d.location}` : ''}
                      {isMine && d.withPartnerId && (
                        <span className="inline-flex items-center gap-0.5 ml-1.5 text-rose-400">
                          <Heart size={10} className="fill-rose-400" />
                        </span>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ListViewSplit({
  myDates,
  theirDates,
  partnerName,
  userId,
}: {
  myDates: DateEvent[]
  theirDates: DateEvent[]
  partnerName: string
  userId: string
}) {
  const navigate = useNavigate()
  const hasAny = myDates.length > 0 || theirDates.length > 0

  if (!hasAny) {
    return (
      <EmptyState
        icon={<CalendarDays size={36} />}
        title="Nenhum date encontrado"
        description="Crie seu primeiro date e comece a planejar."
        action={
          <button onClick={() => navigate('/dates/new')} className="btn-primary">
            <Plus size={14} /> Criar Date
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Meus dates */}
      <div>
        {theirDates.length > 0 && (
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <User size={11} />
            Meus dates
          </p>
        )}
        {myDates.length > 0 ? (
          <DateGroup dates={myDates} ownerId={userId} partnerName={partnerName} />
        ) : (
          theirDates.length > 0 && (
            <p className="text-sm text-stone-400 italic">Nenhum date criado por você.</p>
          )
        )}
      </div>

      {/* Dates do parceiro para mim */}
      {theirDates.length > 0 && (
        <div>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Heart size={11} className="text-rose-400" />
            {partnerName ? `Dates de ${partnerName}` : 'Dates para mim'}
          </p>
          <DateGroup dates={theirDates} ownerId={userId} partnerName={partnerName} />
        </div>
      )}
    </div>
  )
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({
  dates,
  ownerId,
  partnerName,
  month,
  onPrev,
  onNext,
}: {
  dates: DateEvent[]
  ownerId: string
  partnerName: string
  month: Date
  onPrev: () => void
  onNext: () => void
}) {
  const navigate = useNavigate()
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start, end })

  function datesOnDay(day: Date) {
    return dates.filter(d => {
      try { return isSameDay(parseISO(d.date), day) } catch { return false }
    })
  }

  const selectedDates = selectedDay ? datesOnDay(selectedDay) : []

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} className="btn-ghost p-2">
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm font-medium text-stone-900 capitalize">
          {format(month, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={onNext} className="btn-ghost p-2">
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 mb-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="text-center text-xs text-stone-400 py-1 font-medium">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map(day => {
          const items = datesOnDay(day)
          const hasIncoming = items.some(d => d.userId !== ownerId)
          const hasMine     = items.some(d => d.userId === ownerId)
          const isCurrentMonth = isSameMonth(day, month)
          const isToday = isSameDay(day, new Date())
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`
                aspect-square flex flex-col items-center justify-start pt-1.5 rounded-xl text-xs transition-all active:scale-95 relative
                ${!isCurrentMonth ? 'opacity-25' : ''}
                ${isToday && !isSelected ? 'font-bold text-ember-600' : ''}
                ${isSelected ? 'bg-ember-600 text-white shadow-sm shadow-ember-600/30' : 'hover:bg-stone-100 text-stone-700'}
              `}
            >
              <span>{format(day, 'd')}</span>
              {(hasMine || hasIncoming) && (
                <span className="flex items-center gap-0.5 mt-0.5">
                  {hasMine && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-ember-500'}`} />
                  )}
                  {hasIncoming && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/60' : 'bg-rose-400'}`} />
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legenda */}
      {dates.some(d => d.userId !== ownerId) && (
        <div className="flex items-center gap-4 mt-3 px-1">
          <span className="flex items-center gap-1.5 text-xs text-stone-400">
            <span className="w-2 h-2 rounded-full bg-ember-600 shrink-0" /> Meus
          </span>
          <span className="flex items-center gap-1.5 text-xs text-stone-400">
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" /> {partnerName || 'Parceiro'}
          </span>
        </div>
      )}

      {/* Selected day dates */}
      {selectedDay && (
        <div className="mt-5">
          <p className="text-xs font-medium text-stone-500 mb-2 capitalize">
            {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
          {selectedDates.length === 0 ? (
            <p className="text-sm text-stone-400">Nenhum date neste dia.</p>
          ) : (
            <div className="space-y-1.5">
              {selectedDates.map(d => {
                const isMine = d.userId === ownerId
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
                    <div className="min-w-0">
                      {!isMine && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full mb-0.5">
                          <Heart size={9} className="fill-rose-500" />
                          {partnerName || 'Parceiro'}
                        </span>
                      )}
                      <p className="text-sm font-medium text-stone-900 truncate">{d.title}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{d.time}</p>
                    </div>
                    <StatusBadge status={d.status} />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
