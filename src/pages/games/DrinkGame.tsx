import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Wine, RefreshCw, Plus, Trash2, HelpCircle } from 'lucide-react'
import { useGameTutorial } from '../../hooks/useGameTutorial'
import GameTutorial from '../../components/GameTutorial'

// ─── Tutorial ─────────────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    title: 'Bem-vindos ao Drink Game!',
    text: 'Gire a roleta colorida e veja qual desafio ela aponta. Quem perdeu, faz o desafio — ou bebe! A regra é simples: a roleta decide.',
  },
  {
    title: 'Girando a roleta',
    text: 'Na aba "Jogar", toque em "Girar!" e aguarde a roleta parar. O desafio aparece em destaque logo abaixo. Gire quantas vezes quiserem!',
  },
  {
    title: 'Personalizando',
    text: 'Na aba "Editar desafios", adicione seus próprios desafios ou remova os que não quiserem. A roleta se adapta automaticamente ao número de itens.',
  },
]

// ─── Dados ────────────────────────────────────────────────────────────────────

const DEFAULT_CHALLENGES = [
  'Beba 1 gole',
  'Beba 2 goles',
  'Beba 3 goles — direto!',
  'Escolha alguém para beber',
  'Todos bebem',
  'Faça uma careta e mantenha por 10s',
  'Imite o outro por 30s',
  'Conte um segredo envergonhado',
  'Fique em silêncio por 1 rodada',
  'Faça um elogio ao outro',
  'Ligue para alguém aleatório da sua lista',
  'Faça 10 polichinelos',
  'Cante o refrão de uma música',
  'Mande uma mensagem aleatória para um amigo',
  'Beba se mentiu hoje',
  'Fale com sotaque estrangeiro por 2 rodadas',
  'O outro escolhe o que você bebe',
  'Troque de lugar',
  'Diga um fato inusitado sobre você',
  'Beba ou faça 5 polichinelos',
]

// ─── Roleta CSS ───────────────────────────────────────────────────────────────

const COLORS = [
  '#e53e3e', '#dd6b20', '#d69e2e', '#38a169',
  '#3182ce', '#805ad5', '#d53f8c', '#00b5d8',
]

// ─── Componente principal ────────────────────────────────────────────────────

export default function DrinkGame() {
  const navigate = useNavigate()
  const tutorial = useGameTutorial('drink', TUTORIAL_STEPS)
  const [challenges, setChallenges] = useState<string[]>([...DEFAULT_CHALLENGES])
  const [newChallenge, setNewChallenge] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<string | null>(null)
  const [tab, setTab] = useState<'spin' | 'edit'>('spin')
  const spinRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Limpa ao sair
  useEffect(() => () => { if (spinRef.current) clearTimeout(spinRef.current) }, [])

  function spin() {
    if (spinning || challenges.length === 0) return
    setResult(null)
    setSpinning(true)
    const extra = 1800 + Math.random() * 1440 // 3–5 rotações
    const targetRotation = rotation + extra
    setRotation(targetRotation)

    spinRef.current = setTimeout(() => {
      // Calcular qual segmento parou na seta do topo
      const sliceAngle = 360 / challenges.length
      const normalized = ((targetRotation % 360) + 360) % 360
      // Seta aponta para cima (0°) — segmento que parou no topo
      const idx = Math.floor(((360 - normalized) % 360) / sliceAngle) % challenges.length
      setResult(challenges[idx])
      setSpinning(false)
    }, 3200)
  }

  function addChallenge() {
    if (!newChallenge.trim()) return
    setChallenges(c => [...c, newChallenge.trim()])
    setNewChallenge('')
  }

  function removeChallenge(i: number) {
    setChallenges(c => c.filter((_, idx) => idx !== i))
  }

  function reset() {
    setChallenges([...DEFAULT_CHALLENGES])
    setRotation(0)
    setResult(null)
  }

  // ─── SVG da roleta ────────────────────────────────────────────────────────

  function buildWheel(items: string[], size: number) {
    if (items.length === 0) return null
    const cx = size / 2
    const cy = size / 2
    const r = size / 2 - 2
    const sliceAngle = (2 * Math.PI) / items.length

    return items.map((item, i) => {
      const startAngle = i * sliceAngle - Math.PI / 2
      const endAngle = (i + 1) * sliceAngle - Math.PI / 2
      const x1 = cx + r * Math.cos(startAngle)
      const y1 = cy + r * Math.sin(startAngle)
      const x2 = cx + r * Math.cos(endAngle)
      const y2 = cy + r * Math.sin(endAngle)
      const largeArc = sliceAngle > Math.PI ? 1 : 0
      const midAngle = startAngle + sliceAngle / 2
      const textR = r * 0.65
      const tx = cx + textR * Math.cos(midAngle)
      const ty = cy + textR * Math.sin(midAngle)
      const color = COLORS[i % COLORS.length]

      // Truncar label para caber no segmento
      const words = item.split(' ')
      const label = words.length > 2 ? words.slice(0, 2).join(' ') + '…' : item

      return (
        <g key={i}>
          <path
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
            fill={color}
            stroke="#fff"
            strokeWidth="1.5"
          />
          <text
            x={tx}
            y={ty}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={items.length > 12 ? 6 : 8}
            fontWeight="bold"
            transform={`rotate(${(midAngle * 180) / Math.PI + 90}, ${tx}, ${ty})`}
          >
            {label}
          </text>
        </g>
      )
    })
  }

  const [wheelSize, setWheelSize] = useState(() => Math.min(320, (typeof window !== 'undefined' ? window.innerWidth : 375) - 48))
  const wheelContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setWheelSize(Math.min(320, node.offsetWidth - 40))
  }, [])

  return (
    <>
      <GameTutorial
        open={tutorial.open}
        steps={tutorial.steps}
        stepIdx={tutorial.stepIdx}
        onClose={tutorial.close}
        onNext={tutorial.next}
        onPrev={tutorial.prev}
        accentColor="bg-red-600"
        accentBorder="border-red-200"
        accentBg="bg-red-50"
        accentText="text-red-800"
      />
    <div className="flex flex-col min-h-full">
      <div className="px-4 pt-5 pb-3 md:px-7 md:pt-6 border-b border-stone-100 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/ideas/games')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-stone-900">Drink Game — Roleta</h1>
            <p className="text-xs text-stone-400 mt-0.5">Gire a roleta — quem ela apontar, faz o desafio!</p>
          </div>
          <button
            onClick={tutorial.openTutorial}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors shrink-0 text-stone-400 hover:text-stone-700"
            aria-label="Ver tutorial"
          >
            <HelpCircle size={18} />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 px-1">
          <span className="text-amber-500 text-xs leading-none">👥</span>
          <span className="text-[11px] font-semibold text-amber-700">Somente presencial — roleta e desafios compartilhados no mesmo aparelho</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-100 shrink-0">
        {(['spin', 'edit'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              tab === t ? 'text-stone-900 border-b-2 border-stone-900' : 'text-stone-400'
            }`}
          >
            {t === 'spin' ? 'Jogar' : 'Editar desafios'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
        {tab === 'spin' ? (
          <div ref={wheelContainerRef} className="flex flex-col items-center p-5 gap-5">
            {/* Roleta */}
            <div className="relative" style={{ width: wheelSize, height: wheelSize }}>
              {/* Seta indicadora no topo */}
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-3 z-10"
                style={{ width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '20px solid #1c1917' }}
              />
              <svg
                width={wheelSize}
                height={wheelSize}
                viewBox={`0 0 ${wheelSize} ${wheelSize}`}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 3.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                  borderRadius: '50%',
                  overflow: 'hidden',
                }}
              >
                {buildWheel(challenges, wheelSize)}
                <circle cx={wheelSize / 2} cy={wheelSize / 2} r={18} fill="#1c1917" />
              </svg>
            </div>

            {/* Resultado */}
            {result && !spinning && (
              <div className="card p-4 bg-stone-900 text-white text-center w-full max-w-xs animate-bounce-in">
                <p className="text-xs font-bold uppercase text-stone-400 mb-1">Desafio!</p>
                <p className="text-xl font-bold">{result}</p>
              </div>
            )}

            <button
              onClick={spin}
              disabled={spinning || challenges.length === 0}
              className="btn-primary justify-center py-3.5 px-8 text-base rounded-xl disabled:opacity-40"
            >
              <Wine size={16} />
              {spinning ? 'Girando...' : 'Girar!'}
            </button>
            <button onClick={reset} className="btn-ghost text-xs text-stone-400">
              <RefreshCw size={12} />
              Restaurar desafios padrão
            </button>
          </div>
        ) : (
          <div className="p-4 max-w-lg mx-auto space-y-3">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Adicionar novo desafio..."
                value={newChallenge}
                onChange={e => setNewChallenge(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChallenge()}
                maxLength={60}
              />
              <button onClick={addChallenge} disabled={!newChallenge.trim()} className="btn-primary px-3 disabled:opacity-40">
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-1.5">
              {challenges.map((c, i) => (
                <div key={i} className="card px-3 py-2 flex items-center justify-between gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-sm text-stone-700 flex-1">{c}</span>
                  <button
                    onClick={() => removeChallenge(i)}
                    className="btn-ghost p-1 text-stone-300 hover:text-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
