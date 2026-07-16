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

  const isSaved = revealed ? savedIds.has(revealed) : false

  return (
    <div className="px-4 pt-4 pb-6 md:px-7 md:pt-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate('/ideas')}
          className="btn-ghost p-2 shrink-0"
          aria-label="Voltar"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-stone-900 leading-tight">Raspadinha de Dates</h1>
          <p className="text-xs text-stone-400 leading-tight">Toque nos quadradinhos e descubra ideias escondidas</p>
        </div>
      </div>

      {/* ── Contador + botão novo jogo ── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-stone-500">
          <span className="font-semibold text-stone-900">{scratchedCount}</span>
          <span> de 100 revelados</span>
        </p>
        <button
          onClick={handleReset}
          className="btn-ghost py-1.5 px-3 text-xs gap-1.5"
        >
          <Shuffle size={12} />
          Novo jogo
        </button>
      </div>

      {/* ── Banner da ideia revelada ── */}
      {revealed && (
        <div className="card mb-4 p-3 bg-rose-50 border-rose-200">
          {/* linha 1: label + status */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">
              Ideia revelada
            </p>
            {isSaved && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <Check size={11} /> Salva
              </span>
            )}
          </div>
          {/* linha 2: nome da ideia */}
          <p className="text-sm font-semibold text-stone-900 leading-snug mb-3">
            {revealed}
          </p>
          {/* linha 3: ações em full-width */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSaveIdea(revealed)}
              disabled={saving || isSaved}
              className="btn-secondary flex-1 justify-center py-2 text-xs gap-1.5 disabled:opacity-40"
            >
              <Plus size={12} />
              {saving ? 'Salvando...' : 'Salvar ideia'}
            </button>
            <button
              onClick={() => handleSchedule(revealed)}
              className="btn-primary flex-1 justify-center py-2 text-xs gap-1.5"
            >
              Agendar date
            </button>
          </div>
        </div>
      )}

      {/* ── Grid responsivo ── */}
      {/* Mobile: 8 colunas para os quadradinhos terem tamanho tocável (~40px) */}
      {/* Desktop md+: 10 colunas mantendo a grade original */}
      <div className="grid gap-1.5 grid-cols-8 md:grid-cols-10">
        {tiles.map(tile => (
          <button
            key={tile.index}
            onClick={() => !tile.scratched && handleScratch(tile.index)}
            className={[
              'aspect-square rounded-lg flex items-center justify-center text-center',
              'transition-all duration-200 select-none',
              tile.scratched
                ? 'bg-rose-50 border border-rose-200 text-rose-900 cursor-default scale-95 p-0.5'
                : 'bg-rose-700 hover:bg-rose-800 active:scale-90 cursor-pointer',
            ].join(' ')}
            title={tile.scratched ? tile.idea : 'Raspe para revelar'}
          >
            {tile.scratched ? (
              <span className="text-[8px] md:text-[9px] leading-tight font-medium overflow-hidden line-clamp-3 w-full text-center px-0.5">
                {tile.idea}
              </span>
            ) : (
              <Heart size={9} className="fill-rose-300 text-rose-300 shrink-0" />
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
  )
}
