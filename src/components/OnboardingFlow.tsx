import { useState } from 'react'
import {
  Heart,
  MapPin,
  Utensils,
  Users,
  CalendarDays,
  Sparkles,
  ChevronRight,
  X,
  Plus,
} from 'lucide-react'
import type { PartnerGender, PreferenceCategory } from '../types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  userName: string
  onComplete: (data: { gender: PartnerGender; prefs: PreferenceCategory }) => void
}

const EMPTY_PREFS: PreferenceCategory = {
  activitiesLoves: [],
  placesLoves: [],
  placesNever: [],
  placesTolerate: [],
  foodLoves: [],
  foodNever: [],
  foodTolerate: [],
  otherNotes: '',
}

// ─── Pill de tag ──────────────────────────────────────────────────────────────

function TagPill({
  label,
  color,
  onRemove,
}: {
  label: string
  color: string
  onRemove: () => void
}) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${color}`}>
      {label}
      <button type="button" onClick={onRemove} className="hover:opacity-70 ml-0.5">
        <X size={10} />
      </button>
    </span>
  )
}

// ─── Input de tags inline ─────────────────────────────────────────────────────

function TagInput({
  placeholder,
  items,
  color,
  onChange,
}: {
  placeholder: string
  items: string[]
  color: string
  onChange: (items: string[]) => void
}) {
  const [val, setVal] = useState('')

  function add() {
    const v = val.trim()
    if (!v || items.includes(v)) return
    onChange([...items, v])
    setVal('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <TagPill
            key={i}
            label={item}
            color={color}
            onRemove={() => onChange(items.filter((_, idx) => idx !== i))}
          />
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          className="input text-sm flex-1 py-2"
          placeholder={placeholder}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <button
          type="button"
          onClick={add}
          className="btn-secondary py-2 px-3"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Indicador de progresso ───────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-5 h-2 bg-rose-500'
              : i < current
              ? 'w-2 h-2 bg-rose-300'
              : 'w-2 h-2 bg-stone-200'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Telas de onboarding ──────────────────────────────────────────────────────

const TOTAL_STEPS = 6

export default function OnboardingFlow({ userName, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [gender, setGender] = useState<PartnerGender>('m')
  const [prefs, setPrefs] = useState<PreferenceCategory>(EMPTY_PREFS)

  const firstName = userName.split(' ')[0]

  function setField<K extends keyof PreferenceCategory>(key: K, value: PreferenceCategory[K]) {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }

  function next() {
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1)
    else onComplete({ gender, prefs })
  }

  function skip() {
    onComplete({ gender, prefs })
  }

  // ── Step 0: boas-vindas ───────────────────────────────────────────────────
  if (step === 0) {
    return (
      <OnboardingShell step={step} onSkip={skip}>
        <div className="flex flex-col items-center text-center gap-5 py-4">
          <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center animate-bounce-in">
            <Heart size={36} className="text-rose-500" />
          </div>
          <div className="space-y-2 animate-slide-up stagger-1">
            <h2 className="text-xl font-bold text-stone-900">
              Oi, {firstName}! Bem-vindo ao DateFlow 💫
            </h2>
            <p className="text-sm text-stone-500 leading-relaxed max-w-xs">
              Aqui você organiza e planeja dates incríveis com quem você ama.
              Vamos configurar seu perfil em menos de 2 minutos.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full animate-slide-up stagger-2">
            {[
              { icon: CalendarDays, label: 'Planeje dates', color: 'text-sky-500 bg-sky-50' },
              { icon: Heart,        label: 'Compartilhe',   color: 'text-rose-500 bg-rose-50' },
              { icon: Sparkles,     label: 'Surpreenda',    color: 'text-amber-500 bg-amber-50' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-stone-50 border border-stone-100">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${color}`}>
                  <Icon size={17} />
                </div>
                <span className="text-xs font-medium text-stone-600 text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
          <button
            onClick={next}
            className="btn-primary w-full justify-center mt-1 animate-slide-up stagger-3"
          >
            Vamos começar <ChevronRight size={16} />
          </button>
        </div>
      </OnboardingShell>
    )
  }

  // ── Step 1: gênero ────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <OnboardingShell step={step} onSkip={skip} onBack={() => setStep(s => s - 1)}>
        <div className="space-y-5 animate-slide-up">
          <div className="text-center space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Passo 1 de 5</p>
            <h2 className="text-lg font-bold text-stone-900">Como você se identifica?</h2>
            <p className="text-sm text-stone-500">
              Seu parceiro/a vai ver os pronomes certos ao se referir a você.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGender('m')}
              className={`py-5 rounded-2xl border-2 text-sm font-semibold transition-all ${
                gender === 'm'
                  ? 'bg-sky-50 border-sky-400 text-sky-700 scale-[1.02]'
                  : 'border-stone-200 text-stone-500 hover:bg-stone-50'
              }`}
            >
              <div className="text-2xl mb-1">👨</div>
              Homem
            </button>
            <button
              type="button"
              onClick={() => setGender('f')}
              className={`py-5 rounded-2xl border-2 text-sm font-semibold transition-all ${
                gender === 'f'
                  ? 'bg-rose-50 border-rose-400 text-rose-700 scale-[1.02]'
                  : 'border-stone-200 text-stone-500 hover:bg-stone-50'
              }`}
            >
              <div className="text-2xl mb-1">👩</div>
              Mulher
            </button>
          </div>
          <button onClick={next} className="btn-primary w-full justify-center">
            Continuar <ChevronRight size={16} />
          </button>
        </div>
      </OnboardingShell>
    )
  }

  // ── Step 2: atividades ────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <OnboardingShell step={step} onSkip={skip} onBack={() => setStep(s => s - 1)}>
        <div className="space-y-5 animate-slide-up">
          <div className="text-center space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Passo 2 de 5</p>
            <div className="flex items-center justify-center gap-2">
              <Heart size={18} className="text-rose-500" />
              <h2 className="text-lg font-bold text-stone-900">O que você adora fazer?</h2>
            </div>
            <p className="text-sm text-stone-500">Atividades, hobbies, programas que você curte.</p>
          </div>
          <TagInput
            placeholder="Ex: cinema, trilha, museu…"
            items={prefs.activitiesLoves}
            color="bg-rose-50 text-rose-700 border border-rose-100"
            onChange={v => setField('activitiesLoves', v)}
          />
          <button onClick={next} className="btn-primary w-full justify-center">
            Continuar <ChevronRight size={16} />
          </button>
        </div>
      </OnboardingShell>
    )
  }

  // ── Step 3: lugares ───────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <OnboardingShell step={step} onSkip={skip} onBack={() => setStep(s => s - 1)}>
        <div className="space-y-5 animate-slide-up">
          <div className="text-center space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Passo 3 de 5</p>
            <div className="flex items-center justify-center gap-2">
              <MapPin size={18} className="text-violet-500" />
              <h2 className="text-lg font-bold text-stone-900">Onde você curte ir?</h2>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-stone-600">❤️ Adora ir</p>
              <TagInput
                placeholder="Ex: praia, parque, bar…"
                items={prefs.placesLoves}
                color="bg-violet-50 text-violet-700 border border-violet-100"
                onChange={v => setField('placesLoves', v)}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-stone-600">🚫 Não vai de jeito nenhum</p>
              <TagInput
                placeholder="Ex: balada, boate…"
                items={prefs.placesNever}
                color="bg-red-50 text-red-700 border border-red-100"
                onChange={v => setField('placesNever', v)}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-stone-600">😐 Tolera, mas não é fã</p>
              <TagInput
                placeholder="Ex: shopping, karaokê…"
                items={prefs.placesTolerate}
                color="bg-amber-50 text-amber-700 border border-amber-100"
                onChange={v => setField('placesTolerate', v)}
              />
            </div>
          </div>
          <button onClick={next} className="btn-primary w-full justify-center">
            Continuar <ChevronRight size={16} />
          </button>
        </div>
      </OnboardingShell>
    )
  }

  // ── Step 4: comida ────────────────────────────────────────────────────────
  if (step === 4) {
    return (
      <OnboardingShell step={step} onSkip={skip} onBack={() => setStep(s => s - 1)}>
        <div className="space-y-5 animate-slide-up">
          <div className="text-center space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Passo 4 de 5</p>
            <div className="flex items-center justify-center gap-2">
              <Utensils size={18} className="text-emerald-500" />
              <h2 className="text-lg font-bold text-stone-900">E a parte da comida?</h2>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-stone-600">😋 Adora comer</p>
              <TagInput
                placeholder="Ex: pizza, sushi, churrasco…"
                items={prefs.foodLoves}
                color="bg-emerald-50 text-emerald-700 border border-emerald-100"
                onChange={v => setField('foodLoves', v)}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-stone-600">🚫 Não come de jeito nenhum</p>
              <TagInput
                placeholder="Ex: frutos do mar, fígado…"
                items={prefs.foodNever}
                color="bg-red-50 text-red-700 border border-red-100"
                onChange={v => setField('foodNever', v)}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-stone-600">🤔 Come com exceção</p>
              <TagInput
                placeholder="Ex: comida apimentada, carne bem passada…"
                items={prefs.foodTolerate}
                color="bg-amber-50 text-amber-700 border border-amber-100"
                onChange={v => setField('foodTolerate', v)}
              />
            </div>
          </div>
          <button onClick={next} className="btn-primary w-full justify-center">
            Continuar <ChevronRight size={16} />
          </button>
        </div>
      </OnboardingShell>
    )
  }

  // ── Step 5: observações + convite parceiro ────────────────────────────────
  return (
    <OnboardingShell step={step} onSkip={skip} onBack={() => setStep(s => s - 1)}>
      <div className="space-y-5 animate-slide-up">
        <div className="text-center space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Passo 5 de 5</p>
          <div className="flex items-center justify-center gap-2">
            <Users size={18} className="text-sky-500" />
            <h2 className="text-lg font-bold text-stone-900">Mais alguma coisa?</h2>
          </div>
          <p className="text-sm text-stone-500">
            Deixe um recado livre — alergias, restrições, surpresas que ama ou odeia.
          </p>
        </div>
        <textarea
          className="textarea text-sm"
          rows={4}
          placeholder="Ex: sou alérgico a amendoim, amo surpresas, odeio muito barulho…"
          value={prefs.otherNotes}
          onChange={e => setField('otherNotes', e.target.value)}
        />
        <div className="rounded-xl bg-sky-50 border border-sky-100 p-3.5 flex items-start gap-3">
          <Users size={16} className="text-sky-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-sky-800">Dica: conecte seu parceiro/a</p>
            <p className="text-xs text-sky-600 mt-0.5 leading-relaxed">
              Depois você pode vincular seu parceiro/a pelo perfil — {firstName !== 'você' ? `ele/ela` : 'a pessoa'} vai ver suas preferências ao planejar dates pra você! 💑
            </p>
          </div>
        </div>
        <button
          onClick={next}
          className="btn-primary w-full justify-center"
        >
          Concluir configuração 🎉
        </button>
      </div>
    </OnboardingShell>
  )
}

// ─── Shell comum das telas ────────────────────────────────────────────────────

function OnboardingShell({
  step,
  onSkip,
  onBack,
  children,
}: {
  step: number
  onSkip: () => void
  onBack?: () => void
  children: React.ReactNode
}) {
  return (
    // Overlay escuro
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      {/* Card do modal */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl shadow-stone-900/20 overflow-hidden animate-reveal-popup">
        {/* Barra de topo */}
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <div className="w-8">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="text-stone-400 hover:text-stone-600 transition-colors"
                aria-label="Voltar"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>
            )}
          </div>
          <ProgressDots total={TOTAL_STEPS} current={step} />
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Pular
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="px-5 pt-3 pb-6 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  )
}
