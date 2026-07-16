import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Trash2, CheckCircle2, Circle, Share2, CalendarPlus,
  MapPin, Clock, Calendar, Copy, Check, Ban, RotateCcw, Heart, MessageCircle,
  DollarSign, Star, TrendingUp, TrendingDown, Plus, Navigation,
  Eye, EyeOff, Trash, User, Lightbulb, X,
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import * as dbApi from '../lib/db'
import { formatDate, buildGoogleCalendarUrl, generateId } from '../lib/utils'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import type { DateStatus, ExpenseItem } from '../types'

const COURAGE_QUOTES = [
  { text: 'A coragem não é a ausência do medo, mas o julgamento de que algo é mais importante que ele.', author: 'Ambrose Redmoon' },
  { text: 'Você perde 100% das chances que não arrisca.', author: 'Wayne Gretzky' },
  { text: 'Nunca se arrependa de algo que o fez sorrir.', author: 'Mark Twain' },
  { text: 'Se não agora, quando?', author: 'Hillel, o Ancião' },
  { text: 'O único jeito de fazer um grande trabalho é amar o que você faz.', author: 'Franz Kafka' },
  { text: 'Amar alguém é vê-lo como Deus pretendeu.', author: 'Fiódor Dostoiévski' },
  { text: 'Para conquistar o medo, deve-se agir.', author: 'Aristóteles' },
  { text: 'O homem só pode ser feliz se imaginar que a felicidade está a seu alcance.', author: 'Fiódor Dostoiévski' },
]

function getCourageQuote(id: string) {
  const idx = id.charCodeAt(0) % COURAGE_QUOTES.length
  return COURAGE_QUOTES[idx]
}

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Detecta iOS para usar Apple Maps; Android/outros usam Google Maps com fallback Waze */
function buildMapsUrl(location: string): { google: string; apple: string | null; waze: string } {
  const query = encodeURIComponent(location)
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${query}`,
    apple:  /iPhone|iPad|iPod|Mac/i.test(navigator.userAgent)
              ? `maps://maps.apple.com/?q=${query}`
              : null,
    waze: `https://waze.com/ul?q=${query}&navigate=yes`,
  }
}

export default function DateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { dates, refreshDates } = useApp()
  const { user } = useAuth()

  const date = dates.find(d => d.id === id)

  // Nome de quem é o date (withPartnerId resolvido)
  const [withPartnerName, setWithPartnerName] = useState<string | null>(null)
  useEffect(() => {
    if (!user || !date?.withPartnerId) { setWithPartnerName(null); return }
    dbApi.getMyPartnerships(user.uid, user.email ?? undefined).then(all => {
      const p = all.find(p =>
        p.requesterId === date.withPartnerId || p.recipientId === date.withPartnerId
      )
      if (!p) return
      const isMe = p.requesterId === user.uid
      const name  = isMe ? p.recipientName  : p.requesterName
      const email = isMe ? p.recipientEmail : p.requesterEmail
      setWithPartnerName(name || email || null)
    })
  }, [user, date?.withPartnerId])

  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mapsOpen, setMapsOpen] = useState(false)

  // Avaliação
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState(date?.review ?? '')
  const [savingReview, setSavingReview] = useState(false)

  // Gasto dinâmico
  const [expenseLabel, setExpenseLabel] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const amountRef = useRef<HTMLInputElement>(null)

  // Dicas para parceira
  const [newHint, setNewHint] = useState('')
  const [savingHints, setSavingHints] = useState(false)

  async function saveRating(stars: number) {
    if (!date) return
    await dbApi.updateDate(date.id, { rating: stars })
    await refreshDates()
  }

  async function saveReview() {
    if (!date) return
    setSavingReview(true)
    await dbApi.updateDate(date.id, { review: reviewText.trim() || undefined })
    await refreshDates()
    setSavingReview(false)
  }

  async function addExpense() {
    if (!date) return
    const label = expenseLabel.trim()
    const amount = parseFloat(expenseAmount.replace(',', '.'))
    if (!label || isNaN(amount) || amount <= 0) return

    const item: ExpenseItem = { id: generateId(), label, amount }
    const updated = [...(date.expenses ?? []), item]
    const newTotal = updated.reduce((s, e) => s + e.amount, 0)

    await dbApi.updateDate(date.id, { expenses: updated, actualCost: newTotal })
    await refreshDates()
    setExpenseLabel('')
    setExpenseAmount('')
    amountRef.current?.focus()
  }

  async function removeExpense(expenseId: string) {
    if (!date) return
    const updated = (date.expenses ?? []).filter(e => e.id !== expenseId)
    const newTotal = updated.reduce((s, e) => s + e.amount, 0)
    await dbApi.updateDate(date.id, { expenses: updated, actualCost: updated.length ? newTotal : undefined })
    await refreshDates()
  }

  async function toggleShareFinance() {
    if (!date) return
    await dbApi.updateDate(date.id, { shareFinance: !date.shareFinance })
    await refreshDates()
  }

  async function toggleHiddenFromPartner() {
    if (!date) return
    await dbApi.updateDate(date.id, { hiddenFromPartner: !date.hiddenFromPartner })
    await refreshDates()
  }

  async function addHint() {
    if (!date) return
    const text = newHint.trim()
    if (!text) return
    const updated = [...(date.partnerHints ?? []), text]
    setSavingHints(true)
    await dbApi.updateDate(date.id, { partnerHints: updated })
    await refreshDates()
    setNewHint('')
    setSavingHints(false)
  }

  async function removeHint(i: number) {
    if (!date) return
    const updated = (date.partnerHints ?? []).filter((_, idx) => idx !== i)
    await dbApi.updateDate(date.id, { partnerHints: updated })
    await refreshDates()
  }

  if (!date) {
    return (
      <div className="p-7">
        <p className="text-sm text-stone-500">Date não encontrado.</p>
        <button onClick={() => navigate('/dates')} className="btn-ghost mt-3">
          <ArrowLeft size={14} /> Voltar
        </button>
      </div>
    )
  }

  async function setStatus(status: DateStatus) {
    if (!date) return
    await dbApi.updateDate(date.id, { status })
    await refreshDates()
  }

  async function toggleTask(taskId: string) {
    if (!date) return
    const updated = date.checklist.map(t =>
      t.id === taskId ? { ...t, done: !t.done } : t,
    )
    await dbApi.updateDate(date.id, { checklist: updated })
    await refreshDates()
  }

  async function handleDelete() {
    if (!window.confirm('Tem certeza? O date será excluído permanentemente.')) return
    setDeleting(true)
    await dbApi.deleteDate(date!.id)
    await refreshDates()
    navigate('/dates')
  }

  const shareUrl = `${window.location.origin}/share/${date.shareToken}`

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const gcUrl = buildGoogleCalendarUrl(
    date.title, date.date, date.time, date.location, date.description,
  )

  const mapsUrls = date.location ? buildMapsUrl(date.location) : null

  const doneTasks = date.checklist.filter(t => t.done).length
  const totalTasks = date.checklist.length
  const courageQuote = getCourageQuote(date.id)

  const expenses = date.expenses ?? []
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const isActive = date.status === 'confirmed' || date.status === 'done'
  const diff = date.budget != null ? totalExpenses - date.budget : null

  return (
    <div className="p-5 md:p-7 max-w-xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2 -ml-2">
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(`/dates/${id}/edit`)} className="btn-ghost">
            <Edit2 size={14} />
            Editar
          </button>
          <button onClick={handleDelete} disabled={deleting} className="btn-ghost text-red-500 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Title + status */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold text-stone-900 leading-tight">{date.title}</h1>
          <StatusBadge status={date.status} />
        </div>
      </div>

      {/* Frase motivacional */}
      {date.status === 'waiting_courage' && (
        <div className="mb-5 card px-4 py-4 border-rose-100 bg-rose-50">
          <p className="text-sm text-rose-800 italic leading-relaxed">"{courageQuote.text}"</p>
          <p className="text-xs text-rose-500 mt-2">— {courageQuote.author}</p>
        </div>
      )}

      {/* Meta */}
      <div className="card divide-y divide-stone-100 mb-5">
        {withPartnerName && (
          <div className="flex items-center gap-3 px-4 py-3">
            <User size={15} className="text-stone-400 shrink-0" />
            <span className="text-sm text-stone-700">Com {withPartnerName}</span>
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3">
          <Calendar size={15} className="text-stone-400 shrink-0" />
          <span className="text-sm text-stone-700">{formatDate(date.date)}</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Clock size={15} className="text-stone-400 shrink-0" />
          <span className="text-sm text-stone-700">{date.time}</span>
        </div>
        {date.location && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-3 min-w-0">
              <MapPin size={15} className="text-stone-400 shrink-0" />
              <span className="text-sm text-stone-700 truncate">{date.location}</span>
            </span>
            {/* Botão de navegação inline */}
            <button
              onClick={() => setMapsOpen(true)}
              className="shrink-0 ml-2 flex items-center gap-1 text-xs font-medium text-ember-600 hover:text-ember-700 transition-colors"
            >
              <Navigation size={13} />
              Ir
            </button>
          </div>
        )}
        {date.description && (
          <div className="px-4 py-3">
            <p className="text-sm text-stone-600 whitespace-pre-wrap">{date.description}</p>
          </div>
        )}
      </div>

      {/* ── Visibilidade + Dicas para a parceira ── */}
      {date.withPartnerId && (
        <div className="card p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
              <Lightbulb size={12} className="text-amber-400" />
              Para a parceira
            </p>
            {/* Toggle ocultar/mostrar */}
            <button
              onClick={toggleHiddenFromPartner}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                date.hiddenFromPartner
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-stone-100 text-stone-500'
              }`}
              title={date.hiddenFromPartner ? 'Data oculta — ela só vê as dicas' : 'Ela vê todos os detalhes'}
            >
              {date.hiddenFromPartner
                ? <><EyeOff size={12} /> Date oculto</>
                : <><Eye size={12} /> Date visível</>
              }
            </button>
          </div>

          {date.hiddenFromPartner && (
            <p className="text-xs text-violet-600 bg-violet-50 rounded-lg px-3 py-2 mb-3">
              Ela não vê o título, local nem descrição — apenas as dicas abaixo.
            </p>
          )}

          {/* Lista de dicas */}
          <div className="space-y-1.5 mb-2">
            {(date.partnerHints ?? []).length === 0 && (
              <p className="text-xs text-stone-400 italic">
                {date.hiddenFromPartner
                  ? 'Nenhuma dica ainda — adicione ao menos uma para ela.'
                  : 'Nenhuma dica ainda.'}
              </p>
            )}
            {(date.partnerHints ?? []).map((hint, i) => (
              <div key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 group">
                <Lightbulb size={12} className="text-amber-400 shrink-0" />
                <span className="text-sm text-stone-700 flex-1">{hint}</span>
                <button
                  onClick={() => removeHint(i)}
                  className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Input nova dica */}
          <div className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              placeholder="Ex: Traga algo leve para caminhar…"
              value={newHint}
              onChange={e => setNewHint(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHint())}
            />
            <button
              onClick={addHint}
              disabled={savingHints}
              className="btn-secondary shrink-0"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Controle financeiro ── */}
      {isActive && (
        <div className="card mb-5 overflow-hidden">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-stone-400" />
              <span className="text-sm font-medium text-stone-700">Gastos do date</span>
            </div>
            {/* Toggle privacidade */}
            <button
              onClick={toggleShareFinance}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                date.shareFinance
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-stone-100 text-stone-500'
              }`}
              title={date.shareFinance ? 'Parceiro vê os gastos' : 'Gastos privados'}
            >
              {date.shareFinance
                ? <><Eye size={12} /> Visível para o parceiro</>
                : <><EyeOff size={12} /> Só você vê</>
              }
            </button>
          </div>

          {/* Resumo orçamento vs total */}
          {(date.budget != null || totalExpenses > 0) && (
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-end justify-between mb-1.5">
                <span className="text-xs text-stone-400">
                  {date.budget != null ? `Orçamento: ${fmt(date.budget)}` : 'Sem orçamento definido'}
                </span>
                <span className={`text-base font-semibold ${diff != null && diff > 0 ? 'text-red-600' : 'text-stone-900'}`}>
                  {fmt(totalExpenses)}
                </span>
              </div>
              {date.budget != null && (
                <>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${diff != null && diff > 0 ? 'bg-red-400' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min((totalExpenses / date.budget) * 100, 100)}%` }}
                    />
                  </div>
                  {diff != null && (
                    <div className="flex items-center gap-1 text-xs">
                      {diff > 0
                        ? <><TrendingUp size={11} className="text-red-400" /><span className="text-red-500 font-medium">+{fmt(diff)} acima do planejado</span></>
                        : <><TrendingDown size={11} className="text-emerald-500" /><span className="text-emerald-600 font-medium">{fmt(Math.abs(diff))} ainda disponível</span></>
                      }
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Lista de itens */}
          {expenses.length > 0 && (
            <div className="mx-4 mb-3 divide-y divide-stone-100 border border-stone-100 rounded-lg overflow-hidden">
              {expenses.map(exp => (
                <div key={exp.id} className="flex items-center justify-between px-3 py-2.5 group">
                  <span className="text-sm text-stone-700 truncate flex-1">{exp.label}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-sm font-medium text-stone-800">{fmt(exp.amount)}</span>
                    <button
                      onClick={() => removeExpense(exp.id)}
                      className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input de novo gasto */}
          <div className="px-4 pb-4">
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                value={expenseLabel}
                onChange={e => setExpenseLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), amountRef.current?.focus())}
              />
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none">R$</span>
                <input
                  ref={amountRef}
                  className="input text-sm pl-7 w-full"
                  inputMode="decimal"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExpense())}
                />
              </div>
              <button
                onClick={addExpense}
                className="btn-primary shrink-0 px-3"
                aria-label="Adicionar gasto"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checklist */}
      {totalTasks > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wide">Checklist</h2>
            <span className="text-xs text-stone-400">{doneTasks}/{totalTasks}</span>
          </div>
          <div className="h-1 bg-stone-100 rounded-full mb-3 overflow-hidden">
            <div
              className="h-1 bg-stone-900 rounded-full transition-all"
              style={{ width: totalTasks ? `${(doneTasks / totalTasks) * 100}%` : '0%' }}
            />
          </div>
          <div className="space-y-1">
            {date.checklist.map(task => (
              <button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className="flex items-center gap-2.5 w-full text-left py-1.5 group"
              >
                {task.done
                  ? <CheckCircle2 size={16} className="text-stone-900 shrink-0" />
                  : <Circle size={16} className="text-stone-300 group-hover:text-stone-400 shrink-0" />
                }
                <span className={`text-sm ${task.done ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                  {task.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Avaliação — só aparece quando realizado */}
      {date.status === 'done' && (
        <div className="card p-4 mb-5">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Sua avaliação</p>
          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => saveRating(star)}
                className="p-0.5 transition-transform hover:scale-110"
                aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
              >
                <Star
                  size={26}
                  className={`transition-colors ${
                    star <= (hoverRating || date.rating || 0)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-stone-200 fill-stone-100'
                  }`}
                />
              </button>
            ))}
            {date.rating != null && (
              <span className="ml-2 text-sm text-stone-500">{date.rating}/5</span>
            )}
          </div>
          <textarea
            className="textarea text-sm mb-2"
            rows={3}
            placeholder=""
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
          />
          <button
            onClick={saveReview}
            disabled={savingReview}
            className="btn-secondary text-xs"
          >
            {savingReview ? 'Salvando…' : 'Salvar comentário'}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={() => setShareOpen(true)} className="btn-secondary justify-center">
          <Share2 size={14} />
          Compartilhar
        </button>
        <a href={gcUrl} target="_blank" rel="noreferrer" className="btn-secondary justify-center">
          <CalendarPlus size={14} />
          Google Agenda
        </a>
      </div>

      {/* Status transitions */}
      <div className="flex flex-wrap gap-2">
        {date.status === 'waiting_courage' && (
          <>
            <button onClick={() => setStatus('waiting_money')} className="btn-ghost flex-1 justify-center text-amber-700">
              <DollarSign size={13} />
              Precisa de dinheiro
            </button>
            <button onClick={() => setStatus('waiting_reply')} className="btn-secondary flex-1 justify-center">
              <MessageCircle size={13} />
              Chamei ela
            </button>
          </>
        )}
        {date.status === 'waiting_money' && (
          <>
            <button onClick={() => setStatus('waiting_courage')} className="btn-ghost flex-1 justify-center">
              <RotateCcw size={13} />
              Voltar
            </button>
            <button onClick={() => setStatus('waiting_reply')} className="btn-secondary flex-1 justify-center">
              <MessageCircle size={13} />
              Chamei ela
            </button>
          </>
        )}
        {date.status === 'waiting_reply' && (
          <>
            <button onClick={() => setStatus('waiting_courage')} className="btn-ghost flex-1 justify-center">
              <RotateCcw size={13} />
              Voltar
            </button>
            <button onClick={() => setStatus('confirmed')} className="btn-secondary flex-1 justify-center text-emerald-700">
              <Heart size={13} />
              Confirmado!
            </button>
          </>
        )}
        {date.status === 'confirmed' && (
          <>
            <button onClick={() => setStatus('cancelled')} className="btn-ghost text-stone-500 flex-1 justify-center">
              <Ban size={13} />
              Cancelar
            </button>
            <button onClick={() => setStatus('done')} className="btn-secondary flex-1 justify-center">
              <CheckCircle2 size={13} />
              Realizado
            </button>
          </>
        )}
        {date.status === 'cancelled' && (
          <button onClick={() => setStatus('waiting_courage')} className="btn-ghost flex-1 justify-center">
            <RotateCcw size={13} />
            Restaurar
          </button>
        )}
      </div>

      {/* ── Modal: Compartilhar ── */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Compartilhar date">
        <p className="text-xs text-stone-500 mb-3">
          Envie o link abaixo para o seu parceiro ver os detalhes do date.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            readOnly
            className="input text-xs font-mono"
            value={shareUrl}
          />
          <button onClick={copyLink} className="btn-secondary shrink-0">
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          </button>
        </div>
        {copied && (
          <p className="text-xs text-emerald-600 mb-3">Link copiado!</p>
        )}

        {/* Privacidade dos gastos */}
        <div
          className={`flex items-start gap-3 rounded-xl px-3 py-3 border transition-colors cursor-pointer select-none ${
            date.shareFinance
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-stone-200 bg-stone-50'
          }`}
          onClick={toggleShareFinance}
        >
          <div className={`mt-0.5 shrink-0 w-8 h-5 rounded-full relative transition-colors ${date.shareFinance ? 'bg-emerald-500' : 'bg-stone-300'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${date.shareFinance ? 'left-3.5' : 'left-0.5'}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-800">
              {date.shareFinance ? 'Parceiro vê os gastos' : 'Gastos privados'}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              {date.shareFinance
                ? 'O total gasto aparece no link público.'
                : 'Só você enxerga o controle financeiro.'}
            </p>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Navegação ── */}
      <Modal open={mapsOpen} onClose={() => setMapsOpen(false)} title="Abrir no mapa">
        {mapsUrls && (
          <div className="space-y-2">
            <a
              href={mapsUrls.google}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary w-full justify-center"
              onClick={() => setMapsOpen(false)}
            >
              <Navigation size={14} />
              Google Maps
            </a>
            {mapsUrls.apple && (
              <a
                href={mapsUrls.apple}
                className="btn-secondary w-full justify-center"
                onClick={() => setMapsOpen(false)}
              >
                <Navigation size={14} />
                Apple Maps
              </a>
            )}
            <a
              href={mapsUrls.waze}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary w-full justify-center"
              onClick={() => setMapsOpen(false)}
            >
              <Navigation size={14} />
              Waze
            </a>
          </div>
        )}
      </Modal>
    </div>
  )
}
