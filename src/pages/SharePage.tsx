import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Calendar, Clock, MapPin, CheckCircle2, Circle, Heart, CalendarPlus, Star } from 'lucide-react'
import { getDateByShareToken } from '../lib/db'
import { formatDate, buildGoogleCalendarUrl } from '../lib/utils'
import type { DateEvent } from '../types'
import StatusBadge from '../components/StatusBadge'

export default function SharePage() {
  const { token } = useParams()
  const [date, setDate] = useState<DateEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!token) return
    getDateByShareToken(token)
      .then(d => {
        if (d) setDate(d)
        else setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !date) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-center px-4">
        <div>
          <p className="text-stone-500 text-sm">Date não encontrado ou link expirado.</p>
        </div>
      </div>
    )
  }

  const gcUrl = buildGoogleCalendarUrl(date.title, date.date, date.time, date.location, date.description)
  const doneTasks = date.checklist.filter(t => t.done).length
  const totalTasks = date.checklist.length

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4">
      <div className="max-w-sm mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Heart size={16} className="text-ember-600 fill-ember-600" />
          <span className="text-sm font-medium text-stone-500">DateFlow</span>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h1 className="text-lg font-semibold text-stone-900 leading-tight">{date.title}</h1>
            <StatusBadge status={date.status} />
          </div>

          <div className="space-y-2.5 mb-4">
            <div className="flex items-center gap-2.5 text-sm text-stone-600">
              <Calendar size={14} className="text-stone-400 shrink-0" />
              {formatDate(date.date)}
            </div>
            <div className="flex items-center gap-2.5 text-sm text-stone-600">
              <Clock size={14} className="text-stone-400 shrink-0" />
              {date.time}
            </div>
            {date.location && (
              <div className="flex items-center gap-2.5 text-sm">
                <MapPin size={14} className="text-stone-400 shrink-0" />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(date.location)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ember-600 hover:underline"
                >
                  {date.location}
                </a>
              </div>
            )}
          </div>

          {date.description && (
            <p className="text-sm text-stone-600 bg-stone-50 rounded-lg p-3 mb-4 whitespace-pre-wrap">
              {date.description}
            </p>
          )}

          {totalTasks > 0 && (
            <div className="border-t border-stone-100 pt-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Checklist</p>
                <span className="text-xs text-stone-400">{doneTasks}/{totalTasks}</span>
              </div>
              <div className="space-y-1.5">
                {date.checklist.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    {t.done
                      ? <CheckCircle2 size={14} className="text-stone-600 shrink-0" />
                      : <Circle size={14} className="text-stone-300 shrink-0" />
                    }
                    <span className={`text-sm ${t.done ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                      {t.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controle financeiro público — só aparece se o dono permitiu */}
          {date.shareFinance && date.actualCost != null && (
            <div className="border-t border-stone-100 pt-4 mb-4">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Financeiro</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">Total gasto</span>
                <span className="text-stone-700 font-medium">
                  {date.actualCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          )}

          {/* Avaliação pública */}
          {date.rating != null && (
            <div className="border-t border-stone-100 pt-4 mb-4">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Avaliação</p>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={20}
                    className={star <= date.rating! ? 'fill-amber-400 text-amber-400' : 'text-stone-200 fill-stone-100'}
                  />
                ))}
                <span className="ml-1 text-sm text-stone-500">{date.rating}/5</span>
              </div>
              {date.review && (
                <p className="text-sm text-stone-600 italic bg-stone-50 rounded-lg p-3">
                  "{date.review}"
                </p>
              )}
            </div>
          )}

          <a
            href={gcUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary w-full justify-center"
          >
            <CalendarPlus size={14} />
            Salvar no Google Calendar
          </a>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          Planejado com DateFlow
        </p>
      </div>
    </div>
  )
}
