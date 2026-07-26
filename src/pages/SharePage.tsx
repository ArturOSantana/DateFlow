import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, Clock, MapPin, CheckCircle2, Circle, Heart, CalendarPlus, Star, ThumbsUp, ThumbsDown, X } from 'lucide-react'
import { getDateByShareToken, getPartnership, respondToDateInvite } from '../lib/db'
import { formatDate, buildGoogleCalendarUrl } from '../lib/utils'
import type { DateEvent } from '../types'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'

export default function SharePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [date, setDate] = useState<DateEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Estado da resposta
  const [decision, setDecision] = useState<'accepted' | 'declined' | null>(null)
  const [showDeclineForm, setShowDeclineForm] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!token || authLoading) return

    getDateByShareToken(token).then(async d => {
      if (!d) {
        setNotFound(true)
        setLoading(false)
        return
      }

      // Se o usuário logado é a parceira/parceiro vinculado, redireciona para visão completa
      if (user && user.uid !== d.userId) {
        const partnership = await getPartnership(user.uid, d.userId)
        if (partnership && partnership.status === 'accepted') {
          navigate(`/partner/view/${d.userId}`, { replace: true })
          return
        }
      }

      setDate(d)
      // Se já existe uma decisão, mostra o estado final
      if (d.partnerDecision) {
        setDecision(d.partnerDecision)
        setSubmitted(true)
      }
      setLoading(false)
    })
  }, [token, user, authLoading, navigate])

  async function handleAccept() {
    if (!date || !user || submitting) return
    // Só a pessoa vinculada pode responder
    if (date.withPartnerId && user.uid !== date.withPartnerId) return
    setSubmitting(true)
    try {
      await respondToDateInvite(date.id, 'accepted')
      setDecision('accepted')
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDecline() {
    if (!date || !user || submitting) return
    if (date.withPartnerId && user.uid !== date.withPartnerId) return
    setSubmitting(true)
    try {
      await respondToDateInvite(date.id, 'declined', declineReason || undefined)
      setDecision('declined')
      setShowDeclineForm(false)
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  // Verifica se o usuário logado pode responder ao convite
  const canRespond =
    !!user &&
    !!date &&
    user.uid !== date.userId &&
    !!date.withPartnerId &&
    user.uid === date.withPartnerId &&
    !submitted

  // Usuário não logado que recebeu o link via WhatsApp: mostra CTA para entrar
  const notLoggedAndCanTryToRespond =
    !user &&
    !authLoading &&
    !!date &&
    !!date.withPartnerId

  if (authLoading || loading) {
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
      {/* Detalhe decorativo de fundo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-ember-100 rounded-full opacity-30" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-rose-100 rounded-full opacity-20" />
      </div>

      <div className="max-w-sm mx-auto relative">
        {/* Brand */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-7 h-7 bg-ember-600 rounded-xl flex items-center justify-center shadow-sm shadow-ember-600/30">
            <Heart size={13} className="text-white fill-white" />
          </div>
          <span className="text-sm font-bold text-stone-700 tracking-tight">DateFlow</span>
        </div>

        <div className="card p-5 animate-pop-in">
          {/* Título + status */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <h1 className="text-xl font-bold text-stone-900 leading-tight">{date.title}</h1>
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
            {date.location && !date.hiddenFromPartner && (
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

          {date.description && !date.hiddenFromPartner && (
            <p className="text-sm text-stone-600 bg-stone-50 rounded-xl p-3 mb-4 whitespace-pre-wrap border border-stone-100">
              {date.description}
            </p>
          )}

          {/* Dicas — só aparecem quando o date está oculto */}
          {date.hiddenFromPartner && (date.partnerHints ?? []).length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
              <p className="text-xs font-medium text-amber-700 mb-2">Dicas do date 💡</p>
              <ul className="space-y-1">
                {(date.partnerHints ?? []).map((hint, i) => (
                  <li key={i} className="text-sm text-stone-700">• {hint}</li>
                ))}
              </ul>
            </div>
          )}

          {totalTasks > 0 && !date.hiddenFromPartner && (
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

          {/* ── Resposta ao convite ── */}

          {/* Estado final: já respondeu */}
          {submitted && decision === 'accepted' && (
            <div className="border-t border-stone-100 pt-4 mb-4">
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-xl px-4 py-3">
                <ThumbsUp size={16} className="shrink-0" />
                <span className="text-sm font-medium">Você aceitou o date! 🎉</span>
              </div>
            </div>
          )}

          {submitted && decision === 'declined' && (
            <div className="border-t border-stone-100 pt-4 mb-4">
              <div className="flex items-center gap-2 text-stone-500 bg-stone-50 rounded-xl px-4 py-3">
                <ThumbsDown size={16} className="shrink-0" />
                <span className="text-sm font-medium">Você recusou o date.</span>
              </div>
            </div>
          )}

          {/* Botões de aceitar/recusar para a parceira/parceiro vinculado */}
          {canRespond && !showDeclineForm && (
            <div className="border-t border-stone-100 pt-4 mb-4">
              <p className="text-xs text-stone-500 mb-3 text-center">
                Você foi convidado(a) para este date. O que acha?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleAccept}
                  disabled={submitting}
                  className="btn-primary justify-center py-2.5"
                >
                  <ThumbsUp size={14} />
                  Aceitar
                </button>
                <button
                  onClick={() => setShowDeclineForm(true)}
                  disabled={submitting}
                  className="btn-ghost justify-center py-2.5 text-stone-600"
                >
                  <ThumbsDown size={14} />
                  Recusar
                </button>
              </div>
            </div>
          )}

          {/* Formulário de recusa */}
          {canRespond && showDeclineForm && (
            <div className="border-t border-stone-100 pt-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-stone-700">Recusar date</p>
                <button
                  onClick={() => setShowDeclineForm(false)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none mb-3"
                rows={3}
                placeholder="Quer deixar um motivo? (opcional)"
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
              />
              <button
                onClick={handleDecline}
                disabled={submitting}
                className="btn-ghost w-full justify-center text-stone-600"
              >
                {submitting ? 'Enviando…' : 'Confirmar recusa'}
              </button>
            </div>
          )}

          {/* CTA para usuários não logados que receberam o link */}
          {notLoggedAndCanTryToRespond && (
            <div className="border-t border-stone-100 pt-4 mb-4">
              <p className="text-xs text-stone-500 mb-3 text-center">
                Entre no app para aceitar ou recusar este date.
              </p>
              <button
                onClick={() => navigate(`/login?redirect=/share/${token}`)}
                className="btn-primary w-full justify-center"
              >
                <Heart size={14} />
                Entrar no DateFlow
              </button>
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

        <p className="text-center text-xs text-stone-400 mt-5">
          Planejado com ♥ no DateFlow
        </p>
      </div>
    </div>
  )
}
