import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shuffle, CalendarPlus, ArrowLeft, Star } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import EmptyState from '../components/EmptyState'
import { Lightbulb } from 'lucide-react'

export default function DrawPage() {
  const { ideas } = useApp()
  const navigate = useNavigate()
  const [drawn, setDrawn] = useState<(typeof ideas)[0] | null>(null)
  const [animating, setAnimating] = useState(false)

  const eligible = ideas.filter(i => !i.favorite === false || true) // todas as ideias

  function handleDraw() {
    if (eligible.length === 0) return
    setAnimating(true)
    setDrawn(null)

    // pequena animação de suspense
    let count = 0
    const interval = setInterval(() => {
      const random = eligible[Math.floor(Math.random() * eligible.length)]
      setDrawn(random)
      count++
      if (count >= 12) {
        clearInterval(interval)
        setAnimating(false)
      }
    }, 80)
  }

  function handleSchedule() {
    if (!drawn) return
    const params = new URLSearchParams()
    params.set('title', drawn.name)
    if (drawn.notes) params.set('notes', drawn.notes)
    navigate(`/dates/new?${params.toString()}`)
  }

  return (
    <div className="p-5 md:p-7 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/ideas')}
          className="btn-ghost p-2"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-stone-900">Sortear Ideia</h1>
          <p className="text-xs text-stone-400">Uma ideia aleatória do seu banco de ideias</p>
        </div>
      </div>

      {eligible.length === 0 ? (
        <EmptyState
          icon={<Lightbulb size={36} />}
          title="Nenhuma ideia cadastrada"
          description="Adicione ideias ao seu banco para poder sortear."
          action={
            <button onClick={() => navigate('/ideas')} className="btn-primary">
              <Lightbulb size={14} /> Adicionar ideias
            </button>
          }
        />
      ) : (
        <div className="flex flex-col items-center gap-6">
          {/* Área do resultado */}
          <div
            className={`w-full card p-6 flex flex-col items-center justify-center text-center min-h-[200px] transition-all duration-150 ${
              animating ? 'opacity-60 scale-95' : 'opacity-100 scale-100'
            }`}
          >
            {drawn ? (
              <>
                <span className="text-3xl mb-3">🎲</span>
                <p className="text-lg font-semibold text-stone-900 leading-snug mb-1">{drawn.name}</p>
                <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                  {drawn.category}
                </span>
                {drawn.notes && (
                  <p className="text-xs text-stone-500 mt-2 leading-relaxed">{drawn.notes}</p>
                )}
                {drawn.estimatedPrice && (
                  <p className="text-xs text-stone-600 font-medium mt-1">~{drawn.estimatedPrice}</p>
                )}
                {drawn.favorite && (
                  <div className="flex items-center gap-1 mt-2 text-amber-500 text-xs font-medium">
                    <Star size={11} className="fill-amber-500" /> Favorita
                  </div>
                )}
              </>
            ) : (
              <>
                <span className="text-4xl mb-3">🎲</span>
                <p className="text-sm text-stone-400">Pressione o botão para sortear uma ideia</p>
              </>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-3 w-full">
            <button
              onClick={handleDraw}
              disabled={animating}
              className="btn-primary flex-1 justify-center"
            >
              <Shuffle size={15} />
              {animating ? 'Sorteando...' : drawn ? 'Sortear de novo' : 'Sortear'}
            </button>
            {drawn && !animating && (
              <button onClick={handleSchedule} className="btn-secondary flex-1 justify-center">
                <CalendarPlus size={15} />
                Agendar
              </button>
            )}
          </div>

          <p className="text-xs text-stone-400 text-center">
            {eligible.length} {eligible.length === 1 ? 'ideia disponível' : 'ideias disponíveis'} para sortear
          </p>
        </div>
      )}
    </div>
  )
}
