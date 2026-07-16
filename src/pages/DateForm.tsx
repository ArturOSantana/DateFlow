import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, DollarSign } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import * as dbApi from '../lib/db'
import { generateId, generateShareToken } from '../lib/utils'
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
  actualCost: undefined,
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
    dbApi.getMyPartnerships(user.uid).then(all =>
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
          actualCost: existing.actualCost,
          rating: existing.rating,
          review: existing.review,
          withPartnerId: existing.withPartnerId,
        }
      : {
          ...EMPTY,
          title: searchParams.get('title') ?? '',
          location: searchParams.get('location') ?? '',
          description: searchParams.get('notes') ?? '',
        },
  )

  const [newTask, setNewTask] = useState('')
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.date || !form.time) {
      setError('Título, data e horário são obrigatórios.')
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
          <label className="label">Título *</label>
          <input
            className="input"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Data *</label>
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={e => set('date', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Horário *</label>
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

        {/* Controle financeiro */}
        <div>
          <label className="label flex items-center gap-1">
            <DollarSign size={12} className="text-stone-400" />
            Controle financeiro
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-400 mb-1 block">Orçamento (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                placeholder="0,00"
                value={form.budget ?? ''}
                onChange={e => set('budget', e.target.value === '' ? undefined : parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 mb-1 block">Gasto real (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                placeholder="0,00"
                value={form.actualCost ?? ''}
                onChange={e => set('actualCost', e.target.value === '' ? undefined : parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Com quem é esse date — só aparece se há parcerias aceitas com UID preenchido */}
        {partnerships.filter(p => {
          const uid = p.requesterId === user!.uid ? p.recipientId : p.requesterId
          return !!uid
        }).length > 0 && (
          <div>
            <label className="label">Esse date é com quem?</label>
            <select
              className="input"
              value={form.withPartnerId ?? ''}
              onChange={e => set('withPartnerId', e.target.value || undefined)}
            >
              <option value="">Não especificado</option>
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
        )}

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
