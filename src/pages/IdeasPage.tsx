import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Lightbulb, Pencil, Trash2, Search, Star, CalendarPlus, Shuffle, Ticket, Gamepad2 } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import * as dbApi from '../lib/db'
import type { Idea } from '../types'
import { IDEA_CATEGORIES } from '../types'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'

const EMPTY_IDEA: Omit<Idea, 'id' | 'userId' | 'createdAt'> = {
  name: '',
  category: 'Restaurante',
  notes: '',
  estimatedPrice: '',
  favorite: false,
}

export default function IdeasPage() {
  const { ideas, refreshIdeas } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Idea | null>(null)
  const [form, setForm] = useState<typeof EMPTY_IDEA>({ ...EMPTY_IDEA })
  const [saving, setSaving] = useState(false)
  const [filterFav, setFilterFav] = useState(false)

  const filtered = ideas.filter(i => {
    const q = search.toLowerCase()
    const matchQ = i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    const matchFav = filterFav ? i.favorite : true
    return matchQ && matchFav
  })

  function openCreate() {
    setEditTarget(null)
    setForm({ ...EMPTY_IDEA })
    setModalOpen(true)
  }

  function openEdit(idea: Idea) {
    setEditTarget(idea)
    setForm({
      name: idea.name,
      category: idea.category,
      notes: idea.notes,
      estimatedPrice: idea.estimatedPrice,
      favorite: idea.favorite,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editTarget) {
        await dbApi.updateIdea(editTarget.id, form)
      } else {
        await dbApi.createIdea({ ...form, userId: user!.uid })
      }
      await refreshIdeas()
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function toggleFav(idea: Idea) {
    await dbApi.updateIdea(idea.id, { favorite: !idea.favorite })
    await refreshIdeas()
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir esta ideia?')) return
    await dbApi.deleteIdea(id)
    await refreshIdeas()
  }

  return (
    <div className="p-5 md:p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-semibold text-stone-900">Banco de Ideias</h1>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={14} />
          Nova ideia
        </button>
      </div>

      {/* Ações especiais */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <button
          onClick={() => navigate('/ideas/draw')}
          className="card p-3.5 flex items-center gap-3 hover:border-stone-300 hover:shadow-sm transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Shuffle size={16} className="text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-900 leading-snug">Sortear</p>
            <p className="text-xs text-stone-400 leading-snug">Ideia aleatória</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/ideas/scratch')}
          className="card p-3.5 flex items-center gap-3 hover:border-stone-300 hover:shadow-sm transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
            <Ticket size={16} className="text-rose-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-900 leading-snug">Raspadinha</p>
            <p className="text-xs text-stone-400 leading-snug">100 ideias</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/ideas/games')}
          className="card p-3.5 flex items-center gap-3 hover:border-violet-200 hover:shadow-sm transition-all text-left border-violet-100 bg-violet-50/30"
        >
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
            <Gamepad2 size={16} className="text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-900 leading-snug">Jogos</p>
            <p className="text-xs text-stone-400 leading-snug">9 jogos a dois</p>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className="input pl-8"
            placeholder="Pesquisar ideias..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setFilterFav(f => !f)}
          className={`btn-secondary shrink-0 ${filterFav ? 'bg-amber-50 border-amber-200 text-amber-700' : ''}`}
        >
          <Star size={14} className={filterFav ? 'fill-amber-500 text-amber-500' : ''} />
          Favoritos
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Lightbulb size={36} />}
          title="Nenhuma ideia ainda"
          description="Salve restaurantes, passeios e experiências para usar nos seus dates."
          action={
            <button onClick={openCreate} className="btn-primary">
              <Plus size={14} /> Adicionar ideia
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(idea => (
            <div key={idea.id} className="card p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-stone-900 text-sm leading-snug">{idea.name}</p>
                  <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {idea.category}
                  </span>
                </div>
                <button
                  onClick={() => toggleFav(idea)}
                  className={`shrink-0 p-1 rounded-lg hover:bg-stone-100 transition-colors ${
                    idea.favorite ? 'text-amber-500' : 'text-stone-300'
                  }`}
                >
                  <Star size={15} className={idea.favorite ? 'fill-amber-500' : ''} />
                </button>
              </div>

              {idea.notes && (
                <p className="text-xs text-stone-500 leading-relaxed">{idea.notes}</p>
              )}

              {idea.estimatedPrice && (
                <p className="text-xs text-stone-600 font-medium">~{idea.estimatedPrice}</p>
              )}

              <div className="flex gap-1 mt-auto pt-1">
                <button
                  onClick={() => {
                    const params = new URLSearchParams()
                    params.set('title', idea.name)
                    if (idea.notes) params.set('notes', idea.notes)
                    navigate(`/dates/new?${params.toString()}`)
                  }}
                  className="btn-ghost py-1 px-2 text-xs text-stone-500 hover:text-stone-900"
                >
                  <CalendarPlus size={11} />
                  Agendar
                </button>
                <button onClick={() => openEdit(idea)} className="btn-ghost py-1 px-2 text-xs">
                  <Pencil size={11} />
                </button>
                <button onClick={() => handleDelete(idea.id)} className="btn-ghost py-1 px-2 text-xs text-stone-400 hover:text-red-500">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar ideia' : 'Nova ideia'}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Categoria</label>
            <select
              className="input"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {IDEA_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea
              className="textarea"
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Preço estimado</label>
            <input
              className="input"
              value={form.estimatedPrice}
              onChange={e => setForm(f => ({ ...f, estimatedPrice: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="fav"
              checked={form.favorite}
              onChange={e => setForm(f => ({ ...f, favorite: e.target.checked }))}
              className="w-4 h-4 accent-stone-900"
            />
            <label htmlFor="fav" className="text-sm text-stone-700 cursor-pointer">Favoritar</label>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
