import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Calendar, Clock, MapPin, CheckCircle2, Circle,
  CalendarPlus, Star, MessageSquare, ChevronDown, ChevronUp, User,
} from 'lucide-react'
import * as dbApi from '../lib/db'
import { useAuth } from '../contexts/AuthContext'
import { formatDate, buildGoogleCalendarUrl } from '../lib/utils'
import type { DateEvent, Partnership } from '../types'
import StatusBadge from '../components/StatusBadge'

export default function PartnerViewPage() {
  const { partnerId } = useParams<{ partnerId: string }>()
  const { user } = useAuth()

  const [dates, setDates] = useState<DateEvent[]>([])
  const [ownerName, setOwnerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [notAllowed, setNotAllowed] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Observações por date (controladas localmente antes de salvar)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savingNote, setSavingNote] = useState<Record<string, boolean>>({})
  const [savedNote, setSavedNote] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!user || !partnerId) return

    dbApi.getPartnership(user.uid, partnerId).then(async (p: Partnership | null) => {
      if (!p || p.status !== 'accepted') {
        setNotAllowed(true)
        setLoading(false)
        return
      }
      // Descobre o nome do dono (quem não é o usuário atual)
      const name = p.requesterId === user.uid ? p.recipientName : p.requesterName
      setOwnerName(name || '')

      const data = await dbApi.getDatesByOwnerForViewer(partnerId, user.uid)
      setDates(data)
      const initial: Record<string, string> = {}
      data.forEach(d => { if (d.partnerNote) initial[d.id] = d.partnerNote })
      setNotes(initial)
      setLoading(false)
    })
  }, [user, partnerId])

  async function saveNote(dateId: string) {
    const note = (notes[dateId] ?? '').trim()
    setSavingNote(prev => ({ ...prev, [dateId]: true }))
    await dbApi.updateDate(dateId, { partnerNote: note || undefined })
    setSavingNote(prev => ({ ...prev, [dateId]: false }))
    setSavedNote(prev => ({ ...prev, [dateId]: true }))
    setTimeout(() => setSavedNote(prev => ({ ...prev, [dateId]: false })), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (notAllowed) {
    return (
      <div className="p-7 max-w-lg">
        <div className="card p-6 text-center">
          <User size={32} className="text-stone-200 mx-auto mb-3" />
          <p className="text-sm text-stone-600 font-medium">Acesso restrito</p>
          <p className="text-xs text-stone-400 mt-1">
            Você não tem acesso aos dates desse usuário.
          </p>
        </div>
      </div>
    )
  }

  const upcoming = dates.filter(d => !['done', 'cancelled'].includes(d.status))
  const history  = dates.filter(d => ['done', 'cancelled'].includes(d.status))

  return (
    <div className="p-5 md:p-7 max-w-xl">
      <div className="flex items-center gap-2 mb-1">
        {ownerName
          ? <><User size={15} className="text-stone-400 shrink-0" /><h1 className="text-base font-semibold text-stone-900">Dates de {ownerName}</h1></>
          : <h1 className="text-base font-semibold text-stone-900">Dates compartilhados</h1>
        }
      </div>
      <p className="text-sm text-stone-500 mb-6">
        Você pode ver os detalhes e adicionar observações em cada date.
      </p>

      {dates.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-sm text-stone-500">Nenhum date planejado ainda.</p>
        </div>
      )}

      {/* Próximos */}
      {upcoming.length > 0 && (
        <section className="mb-6">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Próximos</p>
          <div className="space-y-3">
            {upcoming.map(d => <DateCard key={d.id} date={d} expanded={expandedId === d.id} onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)} noteValue={notes[d.id] ?? ''} onNoteChange={v => setNotes(prev => ({ ...prev, [d.id]: v }))} onSaveNote={() => saveNote(d.id)} saving={!!savingNote[d.id]} saved={!!savedNote[d.id]} />)}
          </div>
        </section>
      )}

      {/* Histórico */}
      {history.length > 0 && (
        <section>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Histórico</p>
          <div className="space-y-3">
            {history.map(d => <DateCard key={d.id} date={d} expanded={expandedId === d.id} onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)} noteValue={notes[d.id] ?? ''} onNoteChange={v => setNotes(prev => ({ ...prev, [d.id]: v }))} onSaveNote={() => saveNote(d.id)} saving={!!savingNote[d.id]} saved={!!savedNote[d.id]} />)}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Componente de card do date ───────────────────────────────────────────────

interface DateCardProps {
  date: DateEvent
  expanded: boolean
  onToggle: () => void
  noteValue: string
  onNoteChange: (v: string) => void
  onSaveNote: () => void
  saving: boolean
  saved: boolean
}

function DateCard({ date, expanded, onToggle, noteValue, onNoteChange, onSaveNote, saving, saved }: DateCardProps) {
  const gcUrl = buildGoogleCalendarUrl(date.title, date.date, date.time, date.location, date.description)
  const doneTasks = date.checklist.filter(t => t.done).length
  const totalTasks = date.checklist.length

  return (
    <div className="card overflow-hidden">
      {/* Header clicável */}
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-900 leading-tight truncate">{date.title}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-stone-500">
              <Calendar size={11} className="text-stone-400" />
              {formatDate(date.date)}
            </span>
            {date.location && (
              <span className="flex items-center gap-1 text-xs text-stone-500 truncate">
                <MapPin size={11} className="text-stone-400" />
                <span className="truncate">{date.location}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={date.status} />
          {expanded ? <ChevronUp size={14} className="text-stone-400" /> : <ChevronDown size={14} className="text-stone-400" />}
        </div>
      </button>

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="border-t border-stone-100 px-4 pb-4 pt-3 space-y-3">
          {/* Horário */}
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Clock size={13} className="text-stone-400" />
            {date.time}
          </div>

          {/* Local clicável */}
          {date.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={13} className="text-stone-400" />
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

          {/* Descrição */}
          {date.description && (
            <p className="text-sm text-stone-600 bg-stone-50 rounded-lg px-3 py-2.5 whitespace-pre-wrap">
              {date.description}
            </p>
          )}

          {/* Checklist */}
          {totalTasks > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Checklist</p>
                <span className="text-xs text-stone-400">{doneTasks}/{totalTasks}</span>
              </div>
              <div className="space-y-1">
                {date.checklist.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    {t.done
                      ? <CheckCircle2 size={13} className="text-stone-600 shrink-0" />
                      : <Circle size={13} className="text-stone-300 shrink-0" />
                    }
                    <span className={`text-sm ${t.done ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                      {t.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gastos — só se o parceiro permitiu */}
          {date.shareFinance && date.actualCost != null && (
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">Financeiro</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">Total gasto</span>
                <span className="text-stone-700 font-medium">
                  {date.actualCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          )}

          {/* Avaliação */}
          {date.rating != null && (
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">Avaliação</p>
              <div className="flex items-center gap-1 mb-1.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={16}
                    className={star <= date.rating! ? 'fill-amber-400 text-amber-400' : 'text-stone-200 fill-stone-100'}
                  />
                ))}
                <span className="ml-1 text-xs text-stone-500">{date.rating}/5</span>
              </div>
              {date.review && (
                <p className="text-sm text-stone-600 italic bg-stone-50 rounded-lg px-3 py-2">
                  "{date.review}"
                </p>
              )}
            </div>
          )}

          {/* Google Calendar */}
          <a
            href={gcUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary w-full justify-center text-xs"
          >
            <CalendarPlus size={13} />
            Salvar no Google Calendar
          </a>

          {/* ── Campo de observação da parceira ── */}
          <div className="border-t border-stone-100 pt-3">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <MessageSquare size={12} />
              Minha observação
            </p>
            <textarea
              className="textarea text-sm mb-2"
              rows={3}
              placeholder="Adicione um comentário ou sugestão sobre esse date…"
              value={noteValue}
              onChange={e => onNoteChange(e.target.value)}
            />
            <button
              onClick={onSaveNote}
              disabled={saving}
              className="btn-secondary text-xs"
            >
              {saving ? 'Salvando…' : saved ? '✓ Salvo!' : 'Salvar observação'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
