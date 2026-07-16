
import { useNavigate } from 'react-router-dom'
import { History, ArrowRight, CheckCircle2, X, Star } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { formatDate } from '../lib/utils'
import EmptyState from '../components/EmptyState'

const statusAccent: Record<string, string> = {
  done:      'bg-violet-400',
  cancelled: 'bg-stone-300',
}

export default function HistoryPage() {
  const { dates } = useApp()
  const navigate = useNavigate()

  const past = dates
    .filter(d => d.status === 'done' || d.status === 'cancelled')
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="p-5 md:p-7 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-900">Histórico</h1>
        {past.length > 0 && (
          <p className="text-sm text-stone-400 mt-0.5">
            {past.filter(d => d.status === 'done').length} realizado{past.filter(d => d.status === 'done').length !== 1 ? 's' : ''} ·{' '}
            {past.filter(d => d.status === 'cancelled').length} cancelado{past.filter(d => d.status === 'cancelled').length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {past.length === 0 ? (
        <EmptyState
          icon={<History size={36} />}
          title="Histórico vazio"
          description="Dates realizados e cancelados aparecerão aqui."
        />
      ) : (
        <div className="space-y-2">
          {past.map((d, i) => (
            <button
              key={d.id}
              onClick={() => navigate(`/dates/${d.id}`)}
              className="card w-full text-left px-0 py-0 hover:border-stone-300 hover:shadow-md hover:shadow-stone-900/[.06] transition-all active:scale-[.99] overflow-hidden flex animate-slide-up"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              {/* Linha lateral colorida */}
              <div className={`w-1 shrink-0 ${statusAccent[d.status] ?? 'bg-stone-300'}`} />

              <div className="flex items-center justify-between gap-3 px-4 py-3 flex-1 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-stone-900 truncate">{d.title}</p>
                    {d.status === 'done' && d.rating != null && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-amber-500 shrink-0">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        {d.rating}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400">{formatDate(d.date)} · {d.time}</p>
                  {d.location && <p className="text-xs text-stone-400 truncate mt-0.5">{d.location}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {d.status === 'done'
                    ? <CheckCircle2 size={15} className="text-violet-400" />
                    : <X size={15} className="text-stone-300" />
                  }
                  <ArrowRight size={13} className="text-stone-300" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
