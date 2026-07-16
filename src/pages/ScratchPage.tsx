import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Shuffle } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import * as dbApi from '../lib/db'
import { SCRATCH_IDEAS } from '../lib/scratchIdeas'

// Embaralha o array de forma determinística por sessão
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

  // Embaralha as ideias uma vez ao montar a página
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

  return (
    <div className="p-5 md:p-7">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate('/ideas')} className="btn-ghost p-2">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-stone-900">Raspadinha de Dates</h1>
          <p className="text-xs text-stone-400">Raspe os quadradinhos e descubra ideias escondidas</p>
        </div>
      </div>

      {/* Stats + reset */}
      <div className="flex items-center justify-between mb-4 mt-3">
        <p className="text-xs text-stone-500">
          <span className="font-semibold text-stone-900">{scratchedCount}</span> de 100 revelados
        </p>
        <button onClick={handleReset} className="btn-ghost py-1 px-2 text-xs gap-1.5">
          <Shuffle size={12} />
          Novo jogo
        </button>
      </div>

      {/* Revealed banner */}
      {revealed && (
        <div className="card p-3 mb-4 flex items-center justify-between gap-3 bg-amber-50 border-amber-200">
          <div className="min-w-0">
            <p className="text-xs text-amber-700 font-medium mb-0.5">Ideia revelada ✨</p>
            <p className="text-sm font-semibold text-stone-900 leading-snug truncate">{revealed}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => handleSaveIdea(revealed)}
              disabled={saving || savedIds.has(revealed)}
              className={`btn-secondary py-1.5 px-2.5 text-xs gap-1 ${
                savedIds.has(revealed) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Plus size={11} />
              {savedIds.has(revealed) ? 'Salva' : 'Salvar'}
            </button>
            <button
              onClick={() => handleSchedule(revealed)}
              className="btn-primary py-1.5 px-2.5 text-xs gap-1"
            >
              Agendar
            </button>
          </div>
        </div>
      )}

      {/* Grid 10×10 */}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))' }}
      >
        {tiles.map(tile => (
          <button
            key={tile.index}
            onClick={() => !tile.scratched && handleScratch(tile.index)}
            className={`
              aspect-square rounded-lg text-[9px] leading-tight font-medium
              flex items-center justify-center text-center p-0.5
              transition-all duration-200 select-none
              ${tile.scratched
                ? 'bg-amber-50 border border-amber-200 text-amber-800 cursor-default scale-95'
                : 'bg-stone-200 hover:bg-stone-300 text-transparent cursor-pointer active:scale-90'
              }
            `}
            title={tile.scratched ? tile.idea : 'Raspe para revelar'}
          >
            {tile.scratched ? (
              <span className="overflow-hidden line-clamp-3 w-full text-center px-0.5">
                {tile.idea}
              </span>
            ) : (
              <span className="text-stone-400 text-base">?</span>
            )}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-stone-400 mt-4">
        Toque em qualquer quadradinho para revelar uma ideia de date
      </p>
    </div>
  )
}
