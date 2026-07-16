import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Calendar, Clock, MapPin, CheckCircle2, Circle,
  CalendarPlus, Star, MessageSquare, ChevronDown, ChevronUp, User,
  Heart, Utensils, Sparkles, Lightbulb, EyeOff, X, ThumbsDown, ThumbsUp,
} from 'lucide-react'
import * as dbApi from '../lib/db'
import { useAuth } from '../contexts/AuthContext'
import { formatDate, buildGoogleCalendarUrl } from '../lib/utils'
import { getOwnerPronouns } from '../lib/gender'
import type { DateEvent, PartnerGender, Partnership, PreferenceCategory, QuickQuestion } from '../types'
import { POST_DATE_QUESTIONS } from '../types'
import StatusBadge from '../components/StatusBadge'

// ─── Frases motivacionais para aceitar o convite ─────────────────────────────
const LOVE_QUOTES = [
  { text: 'A coragem de amar é o começo de tudo.', author: 'Victor Hugo' },
  { text: 'O amor é a única realidade e não é um mero sentimento. É a verdade última que está no coração da criação.', author: 'Rabindranath Tagore' },
  { text: 'Quem ama, tem sempre algo a dizer.', author: 'Platão' },
  { text: 'O coração tem razões que a própria razão desconhece.', author: 'Blaise Pascal' },
  { text: 'Amar é encontrar a própria felicidade na felicidade do outro.', author: 'Gottfried Leibniz' },
  { text: 'A vida sem amor é como uma árvore sem flores nem frutos.', author: 'Khalil Gibran' },
  { text: 'Uma chance é tudo que precisamos para mudar para sempre.', author: 'C.S. Lewis' },
  { text: 'O maior risco na vida é não arriscar nada.', author: 'Leo Buscaglia' },
  { text: 'O amor não olha com os olhos, mas com a mente.', author: 'William Shakespeare' },
  { text: 'Que esta seja a hora em que ousamos ter esperança.', author: 'Santo Agostinho' },
  { text: 'Não tenhas medo de tentar, mas teme não tentar.', author: 'Provérbio popular' },
  { text: 'Abrir o coração é o primeiro passo para viver de verdade.', author: 'Madre Teresa de Calcutá' },
  { text: 'O amor é paciente, é bondoso; não é invejoso, não se vangloria.', author: '1 Coríntios 13:4' },
  { text: 'Aquele que não arrisca, não vive o amor em sua plenitude.', author: 'Paulo Coelho' },
  { text: 'É melhor ter amado e perdido do que nunca ter amado.', author: 'Alfred Lord Tennyson' },
]

function getRandomQuotes(n = 3) {
  const shuffled = [...LOVE_QUOTES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

// ─── Card de preferências do dono ─────────────────────────────────────────────
function PrefsCard({ prefs, ownerGender }: { prefs: PreferenceCategory; ownerGender?: PartnerGender }) {
  const op = getOwnerPronouns(ownerGender)
  const hasContent =
    prefs.activitiesLoves.length > 0 ||
    prefs.placesLoves.length > 0 ||
    prefs.placesNever.length > 0 ||
    prefs.placesTolerate.length > 0 ||
    prefs.foodLoves.length > 0 ||
    prefs.foodNever.length > 0 ||
    prefs.foodTolerate.length > 0 ||
    prefs.otherNotes.trim().length > 0

  if (!hasContent) return null

  function TagGroup({ items, color, label }: { items: string[]; color: string; label: string }) {
    if (items.length === 0) return null
    return (
      <div className="space-y-1">
        <p className="text-xs text-stone-500">{label}</p>
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{item}</span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Heart size={14} className="text-rose-400" />
        <p className="text-sm font-semibold text-stone-900">{op.prefsTitle}</p>
      </div>

      <div className="space-y-3">
        {/* Atividades */}
        {prefs.activitiesLoves.length > 0 && (
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Heart size={10} className="text-rose-300" /> Atividades
            </p>
            <TagGroup items={prefs.activitiesLoves} color="bg-rose-50 text-rose-700 border border-rose-100" label="Adora fazer" />
          </div>
        )}

        {/* Lugares */}
        {(prefs.placesLoves.length > 0 || prefs.placesNever.length > 0 || prefs.placesTolerate.length > 0) && (
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <MapPin size={10} className="text-violet-400" /> Lugares
            </p>
            <div className="space-y-1.5">
              <TagGroup items={prefs.placesLoves} color="bg-violet-50 text-violet-700 border border-violet-100" label="Adora ir" />
              <TagGroup items={prefs.placesNever} color="bg-red-50 text-red-700 border border-red-100" label="Não vai de jeito nenhum" />
              <TagGroup items={prefs.placesTolerate} color="bg-amber-50 text-amber-700 border border-amber-100" label="Não gosta mas vai" />
            </div>
          </div>
        )}

        {/* Comida */}
        {(prefs.foodLoves.length > 0 || prefs.foodNever.length > 0 || prefs.foodTolerate.length > 0) && (
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Utensils size={10} className="text-emerald-500" /> Comida
            </p>
            <div className="space-y-1.5">
              <TagGroup items={prefs.foodLoves} color="bg-emerald-50 text-emerald-700 border border-emerald-100" label="Adora comer" />
              <TagGroup items={prefs.foodNever} color="bg-red-50 text-red-700 border border-red-100" label="Não come de jeito nenhum" />
              <TagGroup items={prefs.foodTolerate} color="bg-amber-50 text-amber-700 border border-amber-100" label="Come com exceção" />
            </div>
          </div>
        )}

        {/* Outros */}
        {prefs.otherNotes.trim() && (
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">Outras observações</p>
            <p className="text-sm text-stone-600 bg-stone-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{prefs.otherNotes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PartnerViewPage() {
  const { partnerId } = useParams<{ partnerId: string }>()
  const { user } = useAuth()

  const [dates, setDates] = useState<DateEvent[]>([])
  const [ownerName, setOwnerName] = useState('')
  const [ownerGender, setOwnerGender] = useState<PartnerGender | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [notAllowed, setNotAllowed] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Para convite pendente que a usuária pode aceitar aqui
  const [pendingPartnership, setPendingPartnership] = useState<Partnership | null>(null)
  const [acceptingInvite, setAcceptingInvite] = useState(false)
  const [inviteAccepted, setInviteAccepted] = useState(false)
  const [inviteRejected, setInviteRejected] = useState(false)
  const [rejectingInvite, setRejectingInvite] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [quotes] = useState(() => getRandomQuotes(3))

  // Preferências do dono
  const [ownerPrefs, setOwnerPrefs] = useState<PreferenceCategory | null>(null)

  // Observações por date
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savingNote, setSavingNote] = useState<Record<string, boolean>>({})
  const [savedNote, setSavedNote] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!user || !partnerId) return

    dbApi.getPartnership(user.uid, partnerId).then(async (p: Partnership | null) => {
      // Convite pendente: a usuária é a destinatária mas ainda não aceitou
      if (p && p.status === 'pending' &&
        (p.recipientEmail === user.email?.toLowerCase() || p.recipientId === user.uid)) {
        setPendingPartnership(p)
        // Busca o gênero do dono mesmo no convite pendente para mostrar pronome correto
        const gender = await dbApi.getUserGender(partnerId)
        setOwnerGender(gender)
        setLoading(false)
        return
      }

      if (!p || p.status !== 'accepted') {
        setNotAllowed(true)
        setLoading(false)
        return
      }

      await loadData(p)
    })
  }, [user, partnerId])

  async function loadData(p: Partnership) {
    if (!user || !partnerId) return
    const name = p.requesterId === user.uid ? p.recipientName : p.requesterName
    setOwnerName(name || '')

    const data = await dbApi.getDatesByOwnerForViewer(partnerId, user.uid)
    setDates(data)
    const initial: Record<string, string> = {}
    data.forEach(d => { if (d.partnerNote) initial[d.id] = d.partnerNote })
    setNotes(initial)

    // Busca preferências e gênero do dono em paralelo
    const [prefs, gender] = await Promise.all([
      dbApi.getUserPreferences(partnerId),
      dbApi.getUserGender(partnerId),
    ])
    setOwnerPrefs(prefs)
    setOwnerGender(gender)

    setLoading(false)
  }

  async function acceptInvite() {
    if (!user || !pendingPartnership) return
    setAcceptingInvite(true)
    await dbApi.updatePartnership(pendingPartnership.id, {
      status: 'accepted',
      recipientId: user.uid,
      recipientName: user.displayName ?? 'Usuária',
      recipientPhoto: user.photoURL ?? null,
    })
    setAcceptingInvite(false)
    setInviteAccepted(true)

    const updated = await dbApi.getPartnership(user.uid, partnerId!)
    if (updated) {
      setPendingPartnership(null)
      await loadData(updated)
    }
  }

  async function rejectInvite() {
    if (!user || !pendingPartnership) return
    setRejectingInvite(true)
    await dbApi.updatePartnership(pendingPartnership.id, {
      status: 'rejected',
      recipientId: user.uid,
      recipientName: user.displayName ?? 'Usuária',
      recipientPhoto: user.photoURL ?? null,
      rejectionReason: rejectReason.trim() || undefined,
    })
    setRejectingInvite(false)
    setInviteRejected(true)
  }

  async function decideDate(dateId: string, decision: 'accepted' | 'declined', reason?: string) {
    const targetDate = dates.find(d => d.id === dateId)
    if (!targetDate) return

    // Muda status para confirmed se aceito, mantém waiting_reply se recusado
    const newStatus = decision === 'accepted' ? 'confirmed' : targetDate.status

    const decisionUpdate: Partial<DateEvent> = {
      partnerDecision: decision,
      status: newStatus,
    }
    if (reason) decisionUpdate.partnerDecisionReason = reason

    await dbApi.updateDate(dateId, decisionUpdate)

    // Cria notificação para o dono do date
    const notifData: Parameters<typeof dbApi.createNotification>[0] = {
      toUserId: targetDate.userId,
      type: decision === 'accepted' ? 'date_accepted' : 'date_declined',
      dateId,
      dateTitle: targetDate.hiddenFromPartner ? 'Surpresa' : targetDate.title,
      fromName: user?.displayName ?? user?.email ?? 'Parceiro(a)',
    }
    if (reason) notifData.reason = reason
    await dbApi.createNotification(notifData)

    // Atualiza localmente
    setDates(prev => prev.map(d =>
      d.id === dateId
        ? { ...d, partnerDecision: decision, partnerDecisionReason: reason, status: newStatus }
        : d
    ))
  }

  async function saveNote(dateId: string) {
    const note = (notes[dateId] ?? '').trim()
    setSavingNote(prev => ({ ...prev, [dateId]: true }))
    const noteUpdate: Partial<DateEvent> = {}
    if (note) noteUpdate.partnerNote = note
    await dbApi.updateDate(dateId, noteUpdate)
    setSavingNote(prev => ({ ...prev, [dateId]: false }))
    setSavedNote(prev => ({ ...prev, [dateId]: true }))
    setTimeout(() => setSavedNote(prev => ({ ...prev, [dateId]: false })), 2000)
  }

  async function savePartnerRating(dateId: string, stars: number) {
    await dbApi.updateDate(dateId, { partnerRating: stars })
    setDates(prev => prev.map(d => d.id === dateId ? { ...d, partnerRating: stars } : d))
  }

  async function savePartnerReview(dateId: string, text: string) {
    const trimmed = text.trim()
    const reviewUpdate: Partial<DateEvent> = {}
    if (trimmed) reviewUpdate.partnerReview = trimmed
    await dbApi.updateDate(dateId, reviewUpdate)
    setDates(prev => prev.map(d => d.id === dateId ? { ...d, partnerReview: text.trim() || undefined } : d))
  }

  async function savePartnerQuickAnswer(dateId: string, qId: string, answer: string) {
    const target = dates.find(d => d.id === dateId)
    if (!target) return
    const updated = { ...(target.partnerQuickAnswers ?? {}), [qId]: answer }
    await dbApi.updateDate(dateId, { partnerQuickAnswers: updated })
    setDates(prev => prev.map(d => d.id === dateId ? { ...d, partnerQuickAnswers: updated } : d))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
      </div>
    )
  }

  // ── Convite pendente ──────────────────────────────────────────────────────
  if (pendingPartnership && !inviteAccepted) {
    const senderName = pendingPartnership.requesterName || pendingPartnership.requesterEmail
    const op = getOwnerPronouns(ownerGender)

    // Tela de recusa confirmada
    if (inviteRejected) {
      return (
        <div className="p-5 md:p-7 max-w-lg">
          <div className="card p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3">
              <X size={20} className="text-stone-400" />
            </div>
            <p className="text-sm font-semibold text-stone-700 mb-1">Convite recusado</p>
            <p className="text-xs text-stone-400">
              {rejectReason.trim()
                ? `Sua mensagem foi registrada para ${senderName}.`
                : `${senderName} foi notificado da sua decisão.`}
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="p-5 md:p-7 max-w-lg">
        {/* Cabeçalho */}
        <div className="card p-5 mb-5">
          <div className="text-center mb-4">
            {pendingPartnership.requesterPhoto ? (
              <img src={pendingPartnership.requesterPhoto} alt="" className="w-14 h-14 rounded-full mx-auto mb-3" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-stone-200 flex items-center justify-center mx-auto mb-3">
                <User size={22} className="text-stone-500" />
              </div>
            )}
            <p className="text-sm font-semibold text-stone-900 mb-1">
              {senderName} quer te planejar um date
            </p>
            <p className="text-xs text-stone-500">
              Você recebeu um convite de parceria. Aceite para ver os dates {op.plannedBy}.
            </p>
          </div>

          {/* Botões aceitar / recusar */}
          {!showRejectForm && (
            <div className="flex gap-2">
              <button
                onClick={acceptInvite}
                disabled={acceptingInvite}
                className="btn-primary flex-1 justify-center"
              >
                <ThumbsUp size={14} />
                {acceptingInvite ? 'Aceitando…' : 'Aceitar'}
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                className="btn-secondary flex-1 justify-center text-stone-600"
              >
                <ThumbsDown size={14} />
                Recusar
              </button>
            </div>
          )}

          {/* Form de recusa */}
          {showRejectForm && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-stone-700 mb-1.5">
                  Por que você está recusando? <span className="text-stone-400 font-normal">(opcional)</span>
                </p>
                <textarea
                  className="textarea text-sm"
                  rows={3}
                  placeholder="Ex: Não estou pronta para isso agora…"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="btn-ghost flex-1 justify-center text-xs"
                >
                  Voltar
                </button>
                <button
                  onClick={rejectInvite}
                  disabled={rejectingInvite}
                  className="btn-secondary flex-1 justify-center text-xs text-red-600 border-red-200 hover:bg-red-50"
                >
                  <ThumbsDown size={13} />
                  {rejectingInvite ? 'Enviando…' : 'Confirmar recusa'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Frases motivacionais — só quando não está no form de recusa */}
        {!showRejectForm && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={13} className="text-amber-400" />
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Uma pitada de inspiração</p>
            </div>
            {quotes.map((q, i) => (
              <div key={i} className="card p-4 border-l-2 border-rose-200">
                <p className="text-sm text-stone-700 italic mb-1.5">"{q.text}"</p>
                <p className="text-xs text-stone-400 text-right">— {q.author}</p>
              </div>
            ))}
          </div>
        )}
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

  // Dates visíveis (não ocultos) e ocultos (só dicas)
  const visibleDates  = dates.filter(d => !d.hiddenFromPartner)
  const hiddenDates   = dates.filter(d => d.hiddenFromPartner)
  const upcoming = visibleDates.filter(d => !['done', 'cancelled'].includes(d.status))
  const history  = visibleDates.filter(d => ['done', 'cancelled'].includes(d.status))
  const op = getOwnerPronouns(ownerGender)

  return (
    <div className="p-5 md:p-7 max-w-xl">
      <div className="flex items-center gap-2 mb-1">
        {ownerName
          ? <><User size={15} className="text-stone-400 shrink-0" /><h1 className="text-base font-semibold text-stone-900">{op.datesOf} — {ownerName}</h1></>
          : <h1 className="text-base font-semibold text-stone-900">Dates compartilhados</h1>
        }
      </div>
      <p className="text-sm text-stone-500 mb-6">
        Você pode ver os detalhes e adicionar observações em cada date {op.plannedBy}.
      </p>

      {/* Card de preferências do dono */}
      {ownerPrefs && <PrefsCard prefs={ownerPrefs} ownerGender={ownerGender} />}

      {/* ── Dicas de dates ocultos ── */}
      {hiddenDates.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <EyeOff size={12} className="text-violet-400" />
            Surpresas a caminho
          </p>
          <div className="space-y-2">
            {hiddenDates.map(d => (
              <HiddenDateCard
                key={d.id}
                date={d}
                onDecide={(decision, reason) => decideDate(d.id, decision, reason)}
              />
            ))}
          </div>
        </div>
      )}

      {visibleDates.length === 0 && hiddenDates.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-sm text-stone-500">Nenhum date planejado ainda.</p>
        </div>
      )}

      {/* Próximos */}
      {upcoming.length > 0 && (
        <section className="mb-6">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Próximos</p>
          <div className="space-y-3">
            {upcoming.map(d => (
              <DateCard
                key={d.id}
                date={d}
                expanded={expandedId === d.id}
                onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
                noteValue={notes[d.id] ?? ''}
                onNoteChange={v => setNotes(prev => ({ ...prev, [d.id]: v }))}
                onSaveNote={() => saveNote(d.id)}
                saving={!!savingNote[d.id]}
                saved={!!savedNote[d.id]}
                onDecide={(decision, reason) => decideDate(d.id, decision, reason)}
                onSavePartnerRating={stars => savePartnerRating(d.id, stars)}
                onSavePartnerReview={text => savePartnerReview(d.id, text)}
                onSavePartnerQuickAnswer={(q, answer) => savePartnerQuickAnswer(d.id, q.id, answer)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Histórico */}
      {history.length > 0 && (
        <section>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Histórico</p>
          <div className="space-y-3">
            {history.map(d => (
              <DateCard
                key={d.id}
                date={d}
                expanded={expandedId === d.id}
                onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
                noteValue={notes[d.id] ?? ''}
                onNoteChange={v => setNotes(prev => ({ ...prev, [d.id]: v }))}
                onSaveNote={() => saveNote(d.id)}
                saving={!!savingNote[d.id]}
                saved={!!savedNote[d.id]}
                onDecide={(decision, reason) => decideDate(d.id, decision, reason)}
                onSavePartnerRating={stars => savePartnerRating(d.id, stars)}
                onSavePartnerReview={text => savePartnerReview(d.id, text)}
                onSavePartnerQuickAnswer={(q, answer) => savePartnerQuickAnswer(d.id, q.id, answer)}
              />
            ))}
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
  onDecide: (decision: 'accepted' | 'declined', reason?: string) => Promise<void>
  onSavePartnerRating: (stars: number) => Promise<void>
  onSavePartnerReview: (text: string) => Promise<void>
  onSavePartnerQuickAnswer: (q: QuickQuestion, answer: string) => Promise<void>
}

function getIncentiveQuote(id: string) {
  const idx = id.charCodeAt(0) % LOVE_QUOTES.length
  return LOVE_QUOTES[idx]
}

function DateCard({ date, expanded, onToggle, noteValue, onNoteChange, onSaveNote, saving, saved, onDecide,
  onSavePartnerRating, onSavePartnerReview, onSavePartnerQuickAnswer }: DateCardProps) {
  const gcUrl = buildGoogleCalendarUrl(date.title, date.date, date.time, date.location, date.description)
  const doneTasks = date.checklist.filter(t => t.done).length
  const totalTasks = date.checklist.length
  const quote = getIncentiveQuote(date.id)

  // Estado local para resposta ao date
  const [showDeclineForm, setShowDeclineForm] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [deciding, setDeciding] = useState(false)

  // Estado local para avaliação da parceira
  const [partnerHoverRating, setPartnerHoverRating] = useState(0)
  const [partnerReviewText, setPartnerReviewText] = useState(date.partnerReview ?? '')
  const [partnerQuickAnswers, setPartnerQuickAnswers] = useState<Record<string, string>>(date.partnerQuickAnswers ?? {})
  const [savingPartnerReview, setSavingPartnerReview] = useState(false)
  const [savingPartnerQuick, setSavingPartnerQuick] = useState(false)

  async function handleDecide(decision: 'accepted' | 'declined') {
    setDeciding(true)
    await onDecide(decision, decision === 'declined' ? declineReason.trim() : undefined)
    setDeciding(false)
    setShowDeclineForm(false)
  }

  async function handlePartnerRating(stars: number) {
    await onSavePartnerRating(stars)
  }

  async function handlePartnerQuickAnswer(q: QuickQuestion, answer: string) {
    const updated = { ...partnerQuickAnswers, [q.id]: answer }
    setPartnerQuickAnswers(updated)
    setSavingPartnerQuick(true)
    await onSavePartnerQuickAnswer(q, answer)
    setSavingPartnerQuick(false)
  }

  async function handlePartnerReview() {
    setSavingPartnerReview(true)
    await onSavePartnerReview(partnerReviewText)
    setSavingPartnerReview(false)
  }

  return (
    <div className="card overflow-hidden">
      {/* Header clicável */}
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-900 leading-tight truncate">
            {date.hiddenFromPartner ? 'Algo especial está sendo preparado para você' : date.title}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-stone-500">
              <Calendar size={11} className="text-stone-400" />
              {formatDate(date.date)}
            </span>
            {!date.hiddenFromPartner && date.location && (
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

          {/* Local clicável — oculto quando é surpresa */}
          {!date.hiddenFromPartner && date.location && (
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

          {/* Descrição — oculta quando é surpresa */}
          {!date.hiddenFromPartner && date.description && (
            <p className="text-sm text-stone-600 bg-stone-50 rounded-lg px-3 py-2.5 whitespace-pre-wrap">
              {date.description}
            </p>
          )}

          {/* Dicas — só quando é surpresa */}
          {date.hiddenFromPartner && (date.partnerHints ?? []).length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-xs text-stone-400 mb-1 flex items-center gap-1">
                <Lightbulb size={11} className="text-amber-400" /> Dicas:
              </p>
              {(date.partnerHints ?? []).map((hint, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-stone-700">
                  <span className="text-amber-400 mt-0.5">•</span>
                  <span>{hint}</span>
                </div>
              ))}
            </div>
          )}

          {/* Checklist — oculto quando é surpresa */}
          {!date.hiddenFromPartner && totalTasks > 0 && (
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

          {/* Gastos — só se ele permitiu e não é surpresa */}
          {!date.hiddenFromPartner && date.shareFinance && date.actualCost != null && (
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

          {/* ── Avaliações pós-date — quando realizado ── */}
          {date.status === 'done' && (
            <div className="border-t border-stone-100 pt-3 space-y-4">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Avaliações pós-date</p>

              {/* Avaliação do dono (só leitura) */}
              {(date.rating != null || date.review || (date.quickAnswers && Object.keys(date.quickAnswers).length > 0)) && (
                <div>
                  <p className="text-xs text-stone-400 mb-2">Avaliação de quem planejou</p>
                  {date.rating != null && (
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={16}
                          className={star <= date.rating! ? 'fill-amber-400 text-amber-400' : 'text-stone-200 fill-stone-100'}
                        />
                      ))}
                      <span className="ml-1 text-xs text-stone-500">{date.rating}/5</span>
                    </div>
                  )}
                  {date.quickAnswers && Object.keys(date.quickAnswers).length > 0 && (
                    <div className="space-y-1 mb-2">
                      {POST_DATE_QUESTIONS.filter(q => date.quickAnswers?.[q.id]).map(q => (
                        <div key={q.id} className="flex items-start justify-between gap-2">
                          <span className="text-xs text-stone-400 flex-shrink-0">{q.text}</span>
                          <span className="text-xs text-stone-700 font-medium text-right">{date.quickAnswers![q.id]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {date.review && (
                    <p className="text-sm text-stone-600 italic bg-stone-50 rounded-lg px-3 py-2">
                      "{date.review}"
                    </p>
                  )}
                </div>
              )}

              {/* Avaliação da parceira (editável) */}
              <div>
                <p className="text-xs text-stone-400 mb-2">Sua avaliação</p>

                {/* Estrelas */}
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onMouseEnter={() => setPartnerHoverRating(star)}
                      onMouseLeave={() => setPartnerHoverRating(0)}
                      onClick={() => handlePartnerRating(star)}
                      className="p-0.5 transition-transform hover:scale-110"
                      aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        size={22}
                        className={`transition-colors ${
                          star <= (partnerHoverRating || date.partnerRating || 0)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-stone-200 fill-stone-100'
                        }`}
                      />
                    </button>
                  ))}
                  {date.partnerRating != null && (
                    <span className="ml-2 text-xs text-stone-500">{date.partnerRating}/5</span>
                  )}
                </div>

                {/* Perguntas rápidas */}
                <div className="space-y-3 mb-3">
                  {POST_DATE_QUESTIONS.map(q => (
                    <div key={q.id}>
                      <p className="text-xs text-stone-500 mb-1.5">{q.text}</p>
                      {q.options ? (
                        <div className="flex flex-wrap gap-1.5">
                          {q.options.map(opt => (
                            <button
                              key={opt}
                              disabled={savingPartnerQuick}
                              onClick={() => handlePartnerQuickAnswer(q, opt)}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                partnerQuickAnswers[q.id] === opt
                                  ? 'bg-stone-900 text-white border-stone-900'
                                  : 'border-stone-200 text-stone-600 hover:border-stone-400'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          className="input text-sm"
                          placeholder="Escreva aqui…"
                          value={partnerQuickAnswers[q.id] ?? ''}
                          onChange={e => setPartnerQuickAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          onBlur={e => handlePartnerQuickAnswer(q, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Comentário livre */}
                <textarea
                  className="textarea text-sm mb-2"
                  rows={3}
                  placeholder="Comentário sobre o date…"
                  value={partnerReviewText}
                  onChange={e => setPartnerReviewText(e.target.value)}
                />
                <button
                  onClick={handlePartnerReview}
                  disabled={savingPartnerReview}
                  className="btn-secondary text-xs"
                >
                  {savingPartnerReview ? 'Salvando…' : 'Salvar comentário'}
                </button>
              </div>
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

          {/* ── Resposta ao date (aceitar/recusar) — só quando waiting_reply ── */}
          {date.status === 'waiting_reply' && (
            <div className="border-t border-stone-100 pt-3 space-y-3">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                Sua resposta
              </p>

              {/* Frase de incentivo — só quando ainda não respondeu */}
              {!date.partnerDecision && !showDeclineForm && (
                <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2.5">
                  <p className="text-sm text-rose-800 italic leading-relaxed">"{quote.text}"</p>
                  <p className="text-xs text-rose-400 mt-1">— {quote.author}</p>
                </div>
              )}

              {/* Já respondeu */}
              {date.partnerDecision && !showDeclineForm && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-2 ${
                  date.partnerDecision === 'accepted'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {date.partnerDecision === 'accepted'
                    ? <ThumbsUp size={13} className="shrink-0" />
                    : <ThumbsDown size={13} className="shrink-0" />
                  }
                  <span className="text-xs font-medium">
                    {date.partnerDecision === 'accepted' ? 'Você aceitou esse date' : 'Você recusou esse date'}
                  </span>
                  <button
                    onClick={() => {
                      if (date.partnerDecision === 'declined') setShowDeclineForm(true)
                      else handleDecide('declined')
                    }}
                    className="ml-auto text-xs underline opacity-60 hover:opacity-100"
                  >
                    Mudar
                  </button>
                </div>
              )}
              {date.partnerDecision === 'declined' && date.partnerDecisionReason && !showDeclineForm && (
                <p className="text-xs text-stone-500 italic mb-2">"{date.partnerDecisionReason}"</p>
              )}

              {/* Ainda não respondeu ou mudando */}
              {(!date.partnerDecision || showDeclineForm) && (
                <div className="space-y-2">
                  {!showDeclineForm && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDecide('accepted')}
                        disabled={deciding}
                        className="btn-secondary flex-1 justify-center text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      >
                        <ThumbsUp size={13} />
                        Vou adorar!
                      </button>
                      <button
                        onClick={() => setShowDeclineForm(true)}
                        className="btn-secondary flex-1 justify-center text-xs text-stone-600"
                      >
                        <ThumbsDown size={13} />
                        Não quero ir
                      </button>
                    </div>
                  )}
                  {showDeclineForm && (
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-stone-700 mb-1">
                          Por que não quer ir?{' '}
                          <span className="text-red-500">*</span>
                        </p>
                        <textarea
                          className="textarea text-sm"
                          rows={2}
                          placeholder="Conte o motivo para não ir…"
                          value={declineReason}
                          onChange={e => setDeclineReason(e.target.value)}
                          autoFocus
                        />
                        {declineReason.trim() === '' && (
                          <p className="text-xs text-red-500 mt-1">O motivo é obrigatório para recusar.</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowDeclineForm(false)}
                          className="btn-ghost flex-1 justify-center text-xs"
                        >
                          Voltar
                        </button>
                        <button
                          onClick={() => handleDecide('declined')}
                          disabled={deciding || declineReason.trim() === ''}
                          className="btn-secondary flex-1 justify-center text-xs text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ThumbsDown size={13} />
                          {deciding ? 'Salvando…' : 'Confirmar recusa'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

// ─── Card de date oculto (surpresa) ──────────────────────────────────────────

function HiddenDateCard({
  date,
  onDecide,
}: {
  date: DateEvent
  onDecide: (decision: 'accepted' | 'declined', reason?: string) => Promise<void>
}) {
  const quote = getIncentiveQuote(date.id)
  const [showDeclineForm, setShowDeclineForm] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [deciding, setDeciding] = useState(false)

  async function handleDecide(decision: 'accepted' | 'declined') {
    setDeciding(true)
    await onDecide(decision, decision === 'declined' ? declineReason.trim() : undefined)
    setDeciding(false)
    setShowDeclineForm(false)
  }

  return (
    <div className="card p-4 border-l-2 border-violet-200">
      {/* Cabeçalho: ícone + data/hora + status */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
            <EyeOff size={13} className="text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-800">Algo especial está sendo preparado para você</p>
            <p className="text-xs text-stone-400">
              {date.date ? date.date.split('-').reverse().join('/') : 'Data a confirmar'}
              {date.time ? ` às ${date.time}` : ''}
            </p>
          </div>
        </div>
        <StatusBadge status={date.status} />
      </div>

      {/* Dicas */}
      {(date.partnerHints ?? []).length > 0 && (
        <div className="space-y-1 mt-2 pt-2 border-t border-stone-100">
          <p className="text-xs text-stone-400 mb-1 flex items-center gap-1">
            <Lightbulb size={11} className="text-amber-400" /> Dicas:
          </p>
          {(date.partnerHints ?? []).map((hint, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-stone-700">
              <span className="text-amber-400 mt-0.5">•</span>
              <span>{hint}</span>
            </div>
          ))}
        </div>
      )}

      {/* Resposta ao date — só quando waiting_reply */}
      {date.status === 'waiting_reply' && (
        <div className="border-t border-stone-100 mt-3 pt-3 space-y-3">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Sua resposta</p>

          {/* Frase de incentivo — só quando ainda não respondeu */}
          {!date.partnerDecision && !showDeclineForm && (
            <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2.5">
              <p className="text-sm text-rose-800 italic leading-relaxed">"{quote.text}"</p>
              <p className="text-xs text-rose-400 mt-1">— {quote.author}</p>
            </div>
          )}

          {/* Já respondeu */}
          {date.partnerDecision && !showDeclineForm && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
              date.partnerDecision === 'accepted'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {date.partnerDecision === 'accepted'
                ? <ThumbsUp size={13} className="shrink-0" />
                : <ThumbsDown size={13} className="shrink-0" />
              }
              <span className="text-xs font-medium">
                {date.partnerDecision === 'accepted' ? 'Você aceitou esse date' : 'Você recusou esse date'}
              </span>
              <button
                onClick={() => {
                  if (date.partnerDecision === 'declined') setShowDeclineForm(true)
                  else handleDecide('declined')
                }}
                className="ml-auto text-xs underline opacity-60 hover:opacity-100"
              >
                Mudar
              </button>
            </div>
          )}
          {date.partnerDecision === 'declined' && date.partnerDecisionReason && !showDeclineForm && (
            <p className="text-xs text-stone-500 italic">"{date.partnerDecisionReason}"</p>
          )}

          {/* Ainda não respondeu ou mudando */}
          {(!date.partnerDecision || showDeclineForm) && (
            <div className="space-y-2">
              {!showDeclineForm && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecide('accepted')}
                    disabled={deciding}
                    className="btn-secondary flex-1 justify-center text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    <ThumbsUp size={13} />
                    Vou adorar!
                  </button>
                  <button
                    onClick={() => setShowDeclineForm(true)}
                    className="btn-secondary flex-1 justify-center text-xs text-stone-600"
                  >
                    <ThumbsDown size={13} />
                    Não quero ir
                  </button>
                </div>
              )}
              {showDeclineForm && (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-stone-700 mb-1">
                      Por que não quer ir?{' '}
                      <span className="text-red-500">*</span>
                    </p>
                    <textarea
                      className="textarea text-sm"
                      rows={2}
                      placeholder="Conte o motivo para não ir…"
                      value={declineReason}
                      onChange={e => setDeclineReason(e.target.value)}
                      autoFocus
                    />
                    {declineReason.trim() === '' && (
                      <p className="text-xs text-red-500 mt-1">O motivo é obrigatório para recusar.</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeclineForm(false)}
                      className="btn-ghost flex-1 justify-center text-xs"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => handleDecide('declined')}
                      disabled={deciding || declineReason.trim() === ''}
                      className="btn-secondary flex-1 justify-center text-xs text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ThumbsDown size={13} />
                      {deciding ? 'Salvando…' : 'Confirmar recusa'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
