
import { useNavigate } from 'react-router-dom'
import { History, ArrowRight } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { formatDate } from '../lib/utils'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'

export default function HistoryPage() {
  const { dates } = useApp()
  const navigate = useNavigate()

  const past = dates.filter(d => d.status === 'done' || d.status === 'cancelled')

  return (
    <div className="p-5 md:p-7 max-w-2xl">
      <h1 className="text-base font-semibold text-stone-900 mb-5">Histórico</h1>

      {past.length === 0 ? (
        <EmptyState
          icon={<History size={36} />}
          title="Histórico vazio"
          description="Dates realizados e cancelados aparecerão aqui."
        />
      ) : (
        <div className="space-y-1.5">
          {past.map(d => (
            <button
              key={d.id}
              onClick={() => navigate(`/dates/${d.id}`)}
              className="card w-full text-left px-4 py-3 hover:border-stone-300 transition-colors flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{d.title}</p>
                <p className="text-xs text-stone-400 mt-0.5">{formatDate(d.date)} · {d.time}</p>
                {d.location && <p className="text-xs text-stone-400 truncate">{d.location}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={d.status} />
                <ArrowRight size={13} className="text-stone-300" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
