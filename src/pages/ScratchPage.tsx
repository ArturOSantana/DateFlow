import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Shuffle, Heart, Check } from 'lucide-react'
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

export default function ScratchPage() {
  const { refreshIdeas } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()

  const shuffled = useMemo(() => shuffle(SCRATCH_IDEAS), [])

  const [tiles, setTiles] = useState<Tile[]>(() =>
    shuffled.map((idea, index) => ({ index, idea, scratched: false }))
  )
  const [revealed, setRevealed] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const scratchedCount = tiles.filter(t => t.scratched).length
  const isSaved = revealed ? savedIds.has(revealed) : false

  function handleScratch(index: number) {
    setTiles(prev =>
      prev.map(t => (t.index === index ? { ...t, scratched: true } : t))
    )
    setRevealed(tiles[index].idea)
  }

  async function handleSaveIdea(ideaName: string) {
    if (!user || savedIds.has(ideaName)) return
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
      setSavedIds(prev => new Set(prev).add(ideaName))
    } finally {
      setSaving(false)
    }
  }

  function handleSchedule(ideaName: string) {
    const params = new URLSearchParams()
    params.set('title', ideaName)
    navigate(`/dates/new?${params.toString()}`)
  }

  function handleReset() {
    setTiles(shuffle(SCRATCH_IDEAS).map((idea, index) => ({ index, idea, scratched: false })))
    setRevealed(null)
    setSavedIds(new Set())
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Cabeçalho fixo dentro do scroll ── */}
      <div className="px-4 pt-5 pb-3 md:px-7 md:pt-6 border-b border-stone-100">

        {/* Título + voltar */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => navigate('/ideas')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-stone-900 leading-tight">Raspadinha de Dates</h1>
            <p className="text-xs text-stone-400 mt-0.5">Toque nos corações para revelar uma ideia</p>
          </div>
        </div>

        {/* Contador + novo jogo */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-500">
            <span className="font-semibold text-stone-900">{scratchedCount}</span>
            {' '}de 100 revelados
          </p>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors py-1.5 px-3 rounded-lg hover:bg-stone-100"
          >
            <Shuffle size={13} />
            Novo jogo
          </button>
        </div>
      </div>

      {/* ── Banner ideia revelada ── */}
      {revealed && (
        <div className="mx-4 md:mx-7 mt-3 rounded-xl bg-rose-50 border border-rose-200 p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide leading-none">
              Ideia revelada
            </p>
            {isSaved && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium shrink-0">
                <Check size={11} />
                Salva
              </span>
            )}
          </div>
          <p className="text-base font-semibold text-stone-900 leading-snug mb-3">
            {revealed}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleSaveIdea(revealed)}
              disabled={saving || isSaved}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
              {saving ? 'Salvando...' : 'Salvar ideia'}
            </button>
            <button
              onClick={() => handleSchedule(revealed)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-stone-900 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
            >
              Agendar date
            </button>
          </div>
        </div>
      )}

      {/* ── Grade de quadradinhos ── */}
      {/*
        Mobile  (< 640px):  5 colunas → quadradinhos ~64px, toque confortável, texto legível
        Tablet  (sm 640px): 8 colunas
        Desktop (md 768px): 10 colunas
      */}
      <div className="px-4 md:px-7 pt-4 pb-4">
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {tiles.map(tile => (
            <button
              key={tile.index}
              onClick={() => !tile.scratched && handleScratch(tile.index)}
              className={[
                'aspect-square rounded-xl flex items-center justify-center p-1',
                'transition-all duration-200 select-none active:scale-90',
                tile.scratched
                  ? 'bg-rose-50 border border-rose-200 cursor-default'
                  : 'bg-rose-700 hover:bg-rose-800 cursor-pointer shadow-sm',
              ].join(' ')}
              aria-label={tile.scratched ? tile.idea : 'Revelar ideia'}
            >
              {tile.scratched ? (
                <span className="text-[9px] sm:text-[9px] leading-tight font-medium text-rose-900 text-center line-clamp-4 w-full">
                  {tile.idea}
                </span>
              ) : (
                <Heart size={14} className="fill-rose-300 text-rose-300 shrink-0" />
              )}
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-stone-400 mt-4">
          {scratchedCount === 0
            ? 'Toque em qualquer quadradinho para revelar uma ideia'
            : `${100 - scratchedCount} quadradinhos ainda por revelar`}
        </p>
      </div>

    </div>
  )
}
