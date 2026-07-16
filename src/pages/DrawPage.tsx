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

  const eligible = ideas

  function handleDraw() {
    if (eligible.length === 0) return
    setAnimating(true)
    setDrawn(null)

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
    <div className="px-4 pt-5 pb-6 md:px-7 md:pt-6 max-w-lg">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate('/ideas')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors shrink-0"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-stone-900 leading-tight">Sortear Ideia</h1>
          <p className="text-xs text-stone-400 mt-0.5">Uma ideia aleatória do seu banco de ideias</p>
        </div>
      </div>

      {eligible.length === 0 ? (
        <EmptyState
          icon={<Lightbulb size={36} />}
          title="Nenhuma ideia cadastrada"
          description="Adicione ideias ao seu banco para poder sortear."
          action={
            <button onClick={() => navigate('/ideas')} className="btn-primary">
              <Lightbulb size={14} />
              Adicionar ideias
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">

          {/* ── Card resultado ── */}
          <div
            className={[
              'w-full rounded-2xl border border-stone-200 bg-white p-6',
              'flex flex-col items-center justify-center text-center min-h-[220px]',
              'transition-all duration-150',
              animating ? 'opacity-50 scale-95' : 'opacity-100 scale-100',
            ].join(' ')}
          >
            {drawn ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-4 shrink-0">
                  <Shuffle size={22} className="text-amber-600" />
                </div>
                <p className="text-xl font-semibold text-stone-900 leading-snug mb-2 px-2">
                  {drawn.name}
                </p>
                <span className="text-xs text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                  {drawn.category}
                </span>
                {drawn.notes && (
                  <p className="text-sm text-stone-500 mt-3 leading-relaxed px-2">{drawn.notes}</p>
                )}
                {drawn.estimatedPrice && (
                  <p className="text-sm text-stone-600 font-medium mt-1">~{drawn.estimatedPrice}</p>
                )}
                {drawn.favorite && (
                  <div className="flex items-center gap-1 mt-3 text-amber-500 text-xs font-medium">
                    <Star size={12} className="fill-amber-500" />
                    Favorita
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-4 shrink-0">
                  <Shuffle size={26} className="text-stone-400" />
                </div>
                <p className="text-sm text-stone-400 leading-relaxed px-4">
                  Toque em Sortear para revelar uma ideia do seu banco
                </p>
              </>
            )}
          </div>

          {/* ── Botões de ação ── */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleDraw}
              disabled={animating}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-40"
            >
              <Shuffle size={16} />
              {animating ? 'Sorteando...' : drawn ? 'Sortear de novo' : 'Sortear'}
            </button>

            {drawn && !animating && (
              <button
                onClick={handleSchedule}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-stone-100 text-stone-800 text-sm font-medium hover:bg-stone-200 transition-colors"
              >
                <CalendarPlus size={16} />
                Agendar este date
              </button>
            )}
          </div>

          <p className="text-xs text-stone-400 text-center">
            {eligible.length}{' '}
            {eligible.length === 1 ? 'ideia disponível' : 'ideias disponíveis'}
          </p>
        </div>
      )}
    </div>
  )
}
