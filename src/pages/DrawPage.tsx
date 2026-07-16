import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shuffle, CalendarPlus, ArrowLeft, Star, Sparkles } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import EmptyState from '../components/EmptyState'
import { Lightbulb } from 'lucide-react'

export default function DrawPage() {
  const { ideas } = useApp()
  const navigate = useNavigate()
  const [drawn, setDrawn] = useState<(typeof ideas)[0] | null>(null)
  const [animating, setAnimating] = useState(false)
  const [spinKey, setSpinKey] = useState(0)

  const eligible = ideas

  function handleDraw() {
    if (eligible.length === 0) return
    setAnimating(true)
    setDrawn(null)
    setSpinKey(k => k + 1)
// knjnn
    let count = 0
    const interval = setInterval(() => {
      const random = eligible[Math.floor(Math.random() * eligible.length)]
      setDrawn(random)
      count++
      if (count >= 14) {
        clearInterval(interval)
        setAnimating(false)
      }
    }, 70)
  }

  function handleSchedule() {
    if (!drawn) return
    const params = new URLSearchParams()
    params.set('title', drawn.name)
    if (drawn.notes) params.set('notes', drawn.notes)
    navigate(`/dates/new?${params.toString()}`)
  }

  return (
    <div className="px-4 pt-5 pb-8 md:px-7 md:pt-6 max-w-lg">

      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <button
          onClick={() => navigate('/ideas')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors shrink-0"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-stone-900 leading-tight">Sortear Ideia</h1>
          <p className="text-xs text-stone-400 mt-0.5">{eligible.length} ideia{eligible.length !== 1 ? 's' : ''} no banco</p>
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
        <div className="flex flex-col gap-5">

          {/* Card resultado */}
          <div
            className={[
              'w-full rounded-3xl border-2 bg-white p-8',
              'flex flex-col items-center justify-center text-center min-h-[260px]',
              'transition-all duration-200 relative overflow-hidden',
              animating
                ? 'border-ember-200 scale-[.98]'
                : drawn
                ? 'border-ember-300 shadow-lg shadow-ember-600/10'
                : 'border-stone-200',
            ].join(' ')}
          >
            {/* Detalhe decorativo */}
            {drawn && !animating && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-ember-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-60" />
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-rose-50 rounded-full translate-y-1/2 -translate-x-1/2 opacity-60" />
              </div>
            )}

            {drawn ? (
              <div className={animating ? 'opacity-60' : 'animate-pop-in relative z-10'}>
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4 mx-auto">
                  <Sparkles size={24} className="text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-stone-900 leading-snug mb-3 px-2">
                  {drawn.name}
                </p>
                <span className="text-xs font-medium text-stone-500 bg-stone-100 px-3 py-1 rounded-full">
                  {drawn.category}
                </span>
                {drawn.notes && (
                  <p className="text-sm text-stone-500 mt-3 leading-relaxed px-2">{drawn.notes}</p>
                )}
                {drawn.estimatedPrice && (
                  <p className="text-sm text-ember-600 font-semibold mt-2">~{drawn.estimatedPrice}</p>
                )}
                {drawn.favorite && (
                  <div className="flex items-center justify-center gap-1 mt-3 text-amber-500 text-xs font-medium">
                    <Star size={12} className="fill-amber-500" />
                    Favorita
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-float">
                <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4 mx-auto">
                  <Shuffle size={28} className="text-stone-400" />
                </div>
                <p className="text-sm text-stone-400 leading-relaxed px-4">
                  Toque em Sortear para revelar uma ideia
                </p>
              </div>
            )}
          </div>

          {/* Botão sear */}
          <button
            onClick={handleDraw}
            disabled={animating}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-stone-900 text-white text-sm font-bold hover:bg-stone-800 active:scale-[.97] transition-all disabled:opacity-50 shadow-md shadow-stone-900/20"
          >
            <Shuffle
              key={spinKey}
              size={18}
              className={animating ? 'animate-spin-once' : ''}
            />
            {animating ? 'Sorteando…' : drawn ? 'Sortear de novo' : 'Sortear'}
          </button>

          {/* Agendar — surge com animação só quando tem resultado */}
          {drawn && !animating && (
            <button
              onClick={handleSchedule}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl btn-primary justify-center text-sm font-bold animate-slide-up"
            >
              <CalendarPlus size={16} />
              Agendar este date
            </button>
          )}
        </div>
      )}
    </div>
  )
}
