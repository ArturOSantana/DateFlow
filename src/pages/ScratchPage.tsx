import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Shuffle, Heart, Check, CalendarPlus, X } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import * as dbApi from '../lib/db'
import { SCRATCH_IDEAS } from '../lib/scratchIdeas'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Tile {
  index: number
  idea: string
  scratched: boolean
}

// ─── Persistência ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'scratchPage_state_v1'

interface PersistedState {
  order: string[]      // ideias na ordem embaralhada
  scratched: number[]  // índices raspados
  savedIdeas: string[] // nomes das ideias salvas
  scheduledIdeas: string[] // nomes das ideias agendadas
}

function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* storage indisponível */ }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ScratchPage() {
  const { refreshIdeas } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()

  // Inicializa: recupera estado salvo ou cria novo
  const [tiles, setTiles] = useState<Tile[]>(() => {
    const persisted = loadState()
    if (persisted && persisted.order.length === SCRATCH_IDEAS.length) {
      const scratchedSet = new Set(persisted.scratched)
      return persisted.order.map((idea, index) => ({
        index,
        idea,
        scratched: scratchedSet.has(index),
      }))
    }
    return shuffle(SCRATCH_IDEAS).map((idea, index) => ({ index, idea, scratched: false }))
  })

  const [savedIdeas, setSavedIdeas] = useState<Set<string>>(() => {
    const persisted = loadState()
    return new Set(persisted?.savedIdeas ?? [])
  })

  const [scheduledIdeas, setScheduledIdeas] = useState<Set<string>>(() => {
    const persisted = loadState()
    return new Set(persisted?.scheduledIdeas ?? [])
  })

  // Popup: ideia exibida no modal após raspar
  const [popup, setPopup] = useState<string | null>(null)
  const [popupKey, setPopupKey] = useState(0) // força re-animação se raspar outra

  // Estado de salvamento
  const [saving, setSaving] = useState(false)
  const [lastScratched, setLastScratched] = useState<number | null>(null)

  // Persiste estado sempre que muda
  useEffect(() => {
    saveState({
      order: tiles.map(t => t.idea),
      scratched: tiles.filter(t => t.scratched).map(t => t.index),
      savedIdeas: [...savedIdeas],
      scheduledIdeas: [...scheduledIdeas],
    })
  }, [tiles, savedIdeas, scheduledIdeas])

  const scratchedCount = tiles.filter(t => t.scratched).length
  const pct = Math.round((scratchedCount / 100) * 100)

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleScratch(index: number) {
    const idea = tiles[index].idea
    setTiles(prev =>
      prev.map(t => (t.index === index ? { ...t, scratched: true } : t))
    )
    setLastScratched(index)
    setPopup(idea)
    setPopupKey(k => k + 1)
  }

  function handleClosePopup() {
    setPopup(null)
  }

  async function handleSaveIdea(ideaName: string) {
    if (!user || savedIdeas.has(ideaName)) return
    setSaving(true)
    try {
      await dbApi.createIdea({
        userId: user.uid,
        name: ideaName,
        category: 'Outro',
        notes: '',
        estimatedPrice: '',
        favorite: false,
      })
      await refreshIdeas()
      setSavedIdeas(prev => new Set(prev).add(ideaName))
    } finally {
      setSaving(false)
    }
  }

  function handleSchedule(ideaName: string) {
    setScheduledIdeas(prev => new Set(prev).add(ideaName))
    const params = new URLSearchParams()
    params.set('title', ideaName)
    navigate(`/dates/new?${params.toString()}`)
  }

  function handleReset() {
    const newOrder = shuffle(SCRATCH_IDEAS)
    setTiles(newOrder.map((idea, index) => ({ index, idea, scratched: false })))
    setSavedIdeas(new Set())
    setScheduledIdeas(new Set())
    setPopup(null)
    setLastScratched(null)
  }

  // ─── Popup modal ───────────────────────────────────────────────────────────

  const isSaved = popup ? savedIdeas.has(popup) : false
  const isScheduled = popup ? scheduledIdeas.has(popup) : false

  return (
    <div className="flex flex-col min-h-0">

      {/* Cabeçalho */}
      <div className="px-4 pt-5 pb-3 md:px-7 md:pt-6 border-b border-stone-100 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => navigate('/ideas')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-stone-900 leading-tight">Raspadinha de Dates</h1>
            <p className="text-xs text-stone-400 mt-0.5">Toque nos corações para revelar ideias</p>
          </div>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors py-1.5 px-3 rounded-xl hover:bg-stone-100"
          >
            <Shuffle size={13} />
            Novo
          </button>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span><span className="font-bold text-stone-700">{scratchedCount}</span> de 100 revelados</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-1.5 bg-rose-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grade */}
      <div className="px-4 md:px-7 pt-4 pb-6">
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 touch-pan-y">
          {tiles.map(tile => {
            const tileIsSaved = savedIdeas.has(tile.idea)
            const tileIsScheduled = scheduledIdeas.has(tile.idea)
            return (
              <button
                key={tile.index}
                onClick={() => {
                  if (tile.scratched) {
                    // Re-abrir popup ao clicar em tile já raspado
                    setPopup(tile.idea)
                    setPopupKey(k => k + 1)
                  } else {
                    handleScratch(tile.index)
                  }
                }}
                className={[
                  'aspect-square rounded-xl flex items-center justify-center p-1 select-none relative',
                  'transition-colors duration-150',
                  tile.scratched
                    ? 'bg-rose-50 border border-rose-100 cursor-pointer'
                    : 'bg-rose-600 hover:bg-rose-700 cursor-pointer active:scale-90',
                  tile.scratched && lastScratched === tile.index ? 'tile-scratched' : '',
                ].join(' ')}
                aria-label={tile.scratched ? tile.idea : 'Revelar ideia'}
              >
                {tile.scratched ? (
                  <>
                    <span className="text-[8px] sm:text-[9px] leading-tight font-semibold text-rose-800 text-center line-clamp-4 w-full">
                      {tile.idea}
                    </span>
                    {/* Badge de salva/agendada */}
                    {(tileIsSaved || tileIsScheduled) && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center bg-emerald-500 border border-white">
                        <Check size={8} className="text-white" strokeWidth={3} />
                      </span>
                    )}
                  </>
                ) : (
                  <Heart size={13} className="fill-rose-300 text-rose-300 shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        {scratchedCount < 100 && (
          <p className="text-center text-xs text-stone-400 mt-4">
            {scratchedCount === 0
              ? 'Toque em qualquer quadradinho para revelar'
              : `${100 - scratchedCount} ainda por revelar`}
          </p>
        )}
        {scratchedCount === 100 && (
          <p className="text-center text-xs font-semibold text-rose-500 mt-4 animate-bounce-in">
            Todas reveladas! 🎉
          </p>
        )}
      </div>

      {/* ── Pop-up modal ─────────────────────────────────────────────────────── */}
      {popup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
          onClick={handleClosePopup}
        >
          <div
            key={popupKey}
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-reveal-popup"
            onClick={e => e.stopPropagation()}
          >
            {/* Topo colorido */}
            <div className="relative bg-gradient-to-br from-rose-500 to-pink-600 px-6 pt-8 pb-10 text-center">
              <button
                onClick={handleClosePopup}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
                aria-label="Fechar"
              >
                <X size={14} />
              </button>
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                <Heart size={28} className="fill-white text-white" />
              </div>
              <p className="text-xs font-bold text-rose-100 uppercase tracking-widest mb-2">Ideia revelada ✨</p>
              <h2 className="text-2xl font-extrabold text-white leading-snug">{popup}</h2>

              {/* Badges de status */}
              {(isSaved || isScheduled) && (
                <div className="flex justify-center gap-2 mt-3">
                  {isSaved && (
                    <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      <Check size={10} strokeWidth={3} />
                      Salva
                    </span>
                  )}
                  {isScheduled && (
                    <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      <CalendarPlus size={10} />
                      Agendada
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="px-6 py-5 flex flex-col gap-2.5">
              <button
                onClick={() => handleSaveIdea(popup)}
                disabled={saving || isSaved}
                className="w-full btn-secondary justify-center py-3 disabled:opacity-40"
              >
                {isSaved ? <Check size={15} /> : <Plus size={15} />}
                {saving ? 'Salvando…' : isSaved ? 'Salva nas ideias!' : 'Salvar como ideia'}
              </button>
              <button
                onClick={() => handleSchedule(popup)}
                disabled={isScheduled}
                className="w-full btn-primary justify-center py-3 disabled:opacity-40"
              >
                <CalendarPlus size={15} />
                {isScheduled ? 'Já agendada!' : 'Agendar date'}
              </button>
              <button
                onClick={handleClosePopup}
                className="w-full text-center text-sm text-stone-400 hover:text-stone-600 transition-colors pt-1"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
