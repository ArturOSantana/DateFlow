import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Shuffle, Heart, Check, CalendarPlus } from 'lucide-react'
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
  const [lastScratched, setLastScratched] = useState<number | null>(null)

  const scratchedCount = tiles.filter(t => t.scratched).length
  const isSaved = revealed ? savedIds.has(revealed) : false

  function handleScratch(index: number) {
    setTiles(prev =>
      prev.map(t => (t.index === index ? { ...t, scratched: true } : t))
    )
    setRevealed(tiles[index].idea)
    setLastScratched(index)
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
    setLastScratched(null)
  }

  const pct = Math.round((scratchedCount / 100) * 100)

  return (
    <div className="flex flex-col h-full">

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

      {/* Banner ideia revelada */}
      {revealed && (
        <div className="mx-4 md:mx-7 mt-4 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 p-4 scratch-reveal">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Heart size={14} className="text-rose-500 fill-rose-400 shrink-0" />
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wide">Revelada</p>
            </div>
            {isSaved && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold shrink-0 bg-emerald-50 px-2 py-0.5 rounded-full">
                <Check size={10} />
                Salva
              </span>
            )}
          </div>
          <p className="text-lg font-bold text-stone-900 leading-snug mb-3">
            {revealed}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleSaveIdea(revealed)}
              disabled={saving || isSaved}
              className="flex-1 btn-secondary text-xs justify-center py-2.5 disabled:opacity-40"
            >
              <Plus size={13} />
              {saving ? 'Salvando…' : isSaved ? 'Salva!' : 'Salvar'}
            </button>
            <button
              onClick={() => handleSchedule(revealed)}
              className="flex-1 btn-primary text-xs justify-center py-2.5"
            >
              <CalendarPlus size={13} />
              Agendar
            </button>
          </div>
        </div>
      )}

      {/* Grade */}
      <div className="px-4 md:px-7 pt-4 pb-6">
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {tiles.map(tile => (
            <button
              key={tile.index}
              onClick={() => !tile.scratched && handleScratch(tile.index)}
              className={[
                'aspect-square rounded-xl flex items-center justify-center p-1 select-none',
                'transition-colors duration-150',
                tile.scratched
                  ? 'bg-rose-50 border border-rose-100 cursor-default'
                  : 'bg-rose-600 hover:bg-rose-700 cursor-pointer active:scale-90',
                tile.scratched && lastScratched === tile.index ? 'tile-scratched' : '',
              ].join(' ')}
              aria-label={tile.scratched ? tile.idea : 'Revelar ideia'}
            >
              {tile.scratched ? (
                <span className="text-[8px] sm:text-[9px] leading-tight font-semibold text-rose-800 text-center line-clamp-4 w-full">
                  {tile.idea}
                </span>
              ) : (
                <Heart size={13} className="fill-rose-300 text-rose-300 shrink-0" />
              )}
            </button>
          ))}
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
    </div>
  )
}
