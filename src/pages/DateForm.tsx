import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, DollarSign, EyeOff, Eye, Lightbulb, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import * as dbApi from '../lib/db'
import { generateId, generateShareToken } from '../lib/utils'
import { getPronouns } from '../lib/gender'
import type { ChecklistItem, DateEvent, DateStatus, Partnership } from '../types'

const EMPTY: Omit<DateEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  title: '',
  date: '',
  time: '',
  location: '',
  description: '',
  status: 'waiting_courage',
  checklist: [],
  tags: [],
  budget: undefined,
  hiddenFromPartner: false,
  partnerHints: [],
}

export default function DateForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { dates, refreshDates } = useApp()
  const isEdit = Boolean(id)

  // Parcerias ativas — para o seletor "esse date é com quem"
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  useEffect(() => {
    if (!user) return
    dbApi.getMyPartnerships(user.uid, user.email ?? undefined).then(all =>
      setPartnerships(all.filter(p => p.status === 'accepted'))
    )
  }, [user])

  const existing = isEdit ? dates.find(d => d.id === id) : undefined

  const [form, setForm] = useState<Omit<DateEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>(
    existing
      ? {
          title: existing.title,
          date: existing.date,
          time: existing.time,
          location: existing.location,
          description: existing.description,
          status: existing.status,
          checklist: existing.checklist,
          tags: existing.tags,
          shareToken: existing.shareToken,
          budget: existing.budget,
          rating: existing.rating,
          review: existing.review,
          withPartnerId: existing.withPartnerId,
          hiddenFromPartner: existing.hiddenFromPartner ?? false,
          partnerHints: existing.partnerHints ?? [],
        }
      : {
          ...EMPTY,
          title: searchParams.get('title') ?? '',
          location: searchParams.get('location') ?? '',
          description: searchParams.get('notes') ?? '',
        },
  )

  const [newTask, setNewTask] = useState('')
  const [newHint, setNewHint] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof typeof form, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addTask() {
    const text = newTask.trim()
    if (!text) return
    const item: ChecklistItem = { id: generateId(), text, done: false }
    set('checklist', [...form.checklist, item])
    setNewTask('')
  }

  function toggleTask(taskId: string) {
    set(
      'checklist',
      form.checklist.map(t => (t.id === taskId ? { ...t, done: !t.done } : t)),
    )
  }

  function removeTask(taskId: string) {
    set('checklist', form.checklist.filter(t => t.id !== taskId))
  }

  function addHint() {
    const text = newHint.trim()
    if (!text) return
    set('partnerHints', [...(form.partnerHints ?? []), text])
    setNewHint('')
  }

  function removeHint(i: number) {
    set('partnerHints', (form.partnerHints ?? []).filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.date || !form.time) {
      setError('Título, data e horário são obrigatórios.')
      return
    }
    if (form.hiddenFromPartner && form.withPartnerId && (!form.partnerHints || form.partnerHints.length === 0)) {
      const selP = partnerships.find(p => {
        const uid = p.requesterId === user!.uid ? p.recipientId : p.requesterId
        return uid === form.withPartnerId
      })
      const pg = getPronouns(selP?.partnerGender)
      setError(`Adicione ao menos uma dica para ${pg.thePartner}, já que o date está oculto para ${pg.subject}.`)
      return
    }
    setSaving(true)
    try {
      if (isEdit && id) {
        await dbApi.updateDate(id, form)
      } else {
        await dbApi.createDate({
          ...form,
          userId: user!.uid,
          shareToken: generateShareToken(),
        })
      }
      await refreshDates()
      navigate('/dates')
    } catch {
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-5 md:p-7 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2 -ml-2">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-base font-semibold text-stone-900">
          {isEdit ? 'Editar Date' : 'Novo Date'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">
            Título <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              Data <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={e => set('date', e.target.value)}
            />
          </div>
          <div>
            <label className="label">
              Horário <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              className="input"
              value={form.time}
              onChange={e => set('time', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Local</label>
          <input
            className="input"
            value={form.location}
            onChange={e => set('location', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Observações</label>
          <textarea
            className="textarea"
            rows={3}
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />
        </div>

        {/* Orçamento planejado — gasto real é registrado item a item durante o date */}
        <div>
          <label className="label flex items-center gap-1">
            <DollarSign size={12} className="text-stone-400" />
            Orçamento planejado (R$)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="input"
            placeholder="0,00"
            value={form.budget ?? ''}
            onChange={e => set('budget', e.target.value === '' ? undefined : parseFloat(e.target.value))}
          />
          <p className="text-xs text-stone-400 mt-1">
            Os gastos reais são registrados durante o date, item por item.
          </p>
        </div>

        {/* Com quem é esse date — só aparece se há parcerias aceitas com UID preenchido */}
        {partnerships.filter(p => {
          const uid = p.requesterId === user!.uid ? p.recipientId : p.requesterId
          return !!uid
        }).length > 0 && (() => {
          // Pronomes dinâmicos da parceria selecionada (ou default 'f' se nenhuma selecionada ainda)
          const selectedPartnership = partnerships.find(p => {
            const uid = p.requesterId === user!.uid ? p.recipientId : p.requesterId
            return uid === form.withPartnerId
          })
          const pg = getPronouns(selectedPartnership?.partnerGender)

          return (
          <div className="space-y-3">
            <div>
              <label className="label">Compartilhar com {pg.partner}</label>
              <p className="text-xs text-stone-400 mb-1.5">
                {pg.subject.charAt(0).toUpperCase() + pg.subject.slice(1)} só verá esse date se você marcar o nome {pg.of} aqui.
              </p>
              <select
                className="input"
                value={form.withPartnerId ?? ''}
                onChange={e => set('withPartnerId', e.target.value || undefined)}
              >
                <option value="">Não compartilhar (só você vê)</option>
                {partnerships
                  .map(p => {
                    const isMe = p.requesterId === user!.uid
                    const name  = isMe ? p.recipientName  : p.requesterName
                    const email = isMe ? p.recipientEmail : p.requesterEmail
                    const uid   = isMe ? p.recipientId    : p.requesterId
                    return { uid, label: name || email }
                  })
                  .filter(({ uid }) => !!uid)
                  .map(({ uid, label }) => (
                    <option key={uid} value={uid}>{label}</option>
                  ))
                }
              </select>
            </div>

            {/* Opção de ocultar detalhes — só disponível quando há parceira/parceiro selecionado */}
            {form.withPartnerId && (
              <div
                className={`flex items-start gap-3 rounded-xl px-3 py-3 border cursor-pointer select-none transition-colors ${
                  form.hiddenFromPartner
                    ? 'border-violet-200 bg-violet-50'
                    : 'border-stone-200 bg-stone-50'
                }`}
                onClick={() => set('hiddenFromPartner', !form.hiddenFromPartner)}
              >
                <div className={`mt-0.5 shrink-0 w-8 h-5 rounded-full relative transition-colors ${form.hiddenFromPartner ? 'bg-violet-500' : 'bg-stone-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.hiddenFromPartner ? 'left-3.5' : 'left-0.5'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-800 flex items-center gap-1.5">
                    {form.hiddenFromPartner
                      ? <><EyeOff size={13} className="text-violet-500" /> Date oculto para {pg.subject}</>
                      : <><Eye size={13} className="text-stone-400" /> {pg.subject.charAt(0).toUpperCase() + pg.subject.slice(1)} vê os detalhes</>
                    }
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {form.hiddenFromPartner
                      ? `${pg.subject.charAt(0).toUpperCase() + pg.subject.slice(1)} não vê título, local nem descrição — só as dicas abaixo.`
                      : `${pg.subject.charAt(0).toUpperCase() + pg.subject.slice(1)} pode ver todos os detalhes desse date.`}
                  </p>
                </div>
              </div>
            )}

            {/* Dicas — obrigatórias se oculto, opcionais se visível */}
            {form.withPartnerId && (
              <div>
                <label className="label flex items-center gap-1.5">
                  <Lightbulb size={13} className="text-amber-400" />
                  Dicas para {pg.subject}
                  {form.hiddenFromPartner && <span className="text-red-400 text-xs">(obrigatório)</span>}
                </label>
                <p className="text-xs text-stone-400 mb-2">
                  {form.hiddenFromPartner
                    ? `Já que o date está oculto, deixe dicas para ${pg.subject} saber o que preparar ou esperar.`
                    : `Opcional: deixe dicas extras para ${pg.subject} sobre o date.`}
                </p>
                <div className="space-y-1.5 mb-2">
                  {(form.partnerHints ?? []).map((hint, i) => (
                    <div key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      <Lightbulb size={12} className="text-amber-400 shrink-0" />
                      <span className="text-sm text-stone-700 flex-1">{hint}</span>
                      <button type="button" onClick={() => removeHint(i)} className="text-stone-400 hover:text-red-500">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="Ex: Vista algo confortável…"
                    value={newHint}
                    onChange={e => setNewHint(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHint())}
                  />
                  <button type="button" onClick={addHint} className="btn-secondary shrink-0">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
          )
        })()}

        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={form.status}
            onChange={e => set('status', e.target.value as DateStatus)}
          >
            <option value="waiting_courage">Aguardando Coragem</option>
            <option value="waiting_money">Aguardando Dinheiro</option>
            <option value="waiting_reply">Aguardando Resposta</option>
            <option value="confirmed">Confirmado</option>
            <option value="cancelled">Cancelado</option>
            <option value="done">Realizado</option>
          </select>
        </div>

        <div>
          <label className="label">Checklist</label>
          <div className="space-y-1.5 mb-2">
            {form.checklist.map(task => (
              <div key={task.id} className="flex items-center gap-2 group">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  className="w-4 h-4 accent-stone-900 rounded cursor-pointer"
                />
                <span className={`flex-1 text-sm ${task.done ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                  {task.text}
                </span>
                <button
                  type="button"
                  onClick={() => removeTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Nova tarefa..."
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTask())}
            />
            <button type="button" onClick={addTask} className="btn-secondary shrink-0">
              <Plus size={14} />
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </div>
  )
}
