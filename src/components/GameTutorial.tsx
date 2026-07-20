import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { TutorialStep } from '../hooks/useGameTutorial'

interface GameTutorialProps {
  open: boolean
  steps: TutorialStep[]
  stepIdx: number
  onClose: () => void
  onNext: () => void
  onPrev: () => void
  accentColor?: string   // ex: 'bg-violet-600'
  accentBorder?: string  // ex: 'border-violet-200'
  accentBg?: string      // ex: 'bg-violet-50'
  accentText?: string    // ex: 'text-violet-700'
}

export default function GameTutorial({
  open,
  steps,
  stepIdx,
  onClose,
  onNext,
  onPrev,
  accentColor = 'bg-stone-900',
  accentBorder = 'border-stone-200',
  accentBg = 'bg-stone-50',
  accentText = 'text-stone-700',
}: GameTutorialProps) {
  if (!open || steps.length === 0) return null

  const step = steps[stepIdx]
  const isLast = stepIdx === steps.length - 1
  const isFirst = stepIdx === 0

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className={`w-full max-w-sm rounded-2xl border ${accentBorder} ${accentBg} shadow-xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${accentColor} px-5 py-4 flex items-center justify-between`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              Passo {stepIdx + 1} de {steps.length}
            </p>
            <p className="text-base font-bold text-white leading-snug mt-0.5">
              {step.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Fechar tutorial"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className={`text-sm leading-relaxed ${accentText}`}>{step.text}</p>
        </div>

        {/* Dots */}
        {steps.length > 1 && (
          <div className="flex justify-center gap-1.5 pb-3">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`block rounded-full transition-all ${
                  i === stepIdx ? 'w-4 h-2 bg-stone-500' : 'w-2 h-2 bg-stone-300'
                }`}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          {!isFirst && (
            <button
              onClick={onPrev}
              className="btn-secondary flex-1 justify-center text-sm"
            >
              <ChevronLeft size={14} />
              Anterior
            </button>
          )}
          {isLast ? (
            <button
              onClick={onClose}
              className={`${accentColor} flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90`}
            >
              Entendido!
            </button>
          ) : (
            <button
              onClick={onNext}
              className={`${accentColor} flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90`}
            >
              Próximo
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
