import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X, RefreshCw, Plus, Shuffle, Beer, HelpCircle } from 'lucide-react'
import { useGameTutorial } from '../../hooks/useGameTutorial'
import GameTutorial from '../../components/GameTutorial'

// ─── Tutorial ─────────────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    title: 'Bem-vindos ao Eu Nunca!',
    text: 'Uma frase "Eu nunca…" aparece na tela. Quem já fez aquilo levanta o dedo — ou, se quiser, bebe. Vale ser honesto(a)!',
  },
  {
    title: 'Configurando o jogo',
    text: 'Antes de começar, digitem os nomes dos dois jogadores. Vocês também podem adicionar frases personalizadas para deixar o jogo mais divertido e íntimo.',
  },
  {
    title: 'Marcando quem bebeu',
    text: 'Durante o jogo, toque em "Revelar e marcar quem bebeu". Selecione quem fez aquela coisa e depois avance para a próxima frase.',
  },
  {
    title: 'Dicas extras',
    text: 'Use "Adicionar frase" para colocar suas próprias situações a qualquer momento. "Embaralhar" muda a ordem das frases. Ao final, veja quem bebeu mais!',
  },
]

// ─── Dados ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPTS = [
  'Eu nunca fui preso(a)',
  'Eu nunca menti para um amigo para evitar uma saída',
  'Eu nunca fingi dormir para não atender o telefone',
  'Eu nunca cancelei um compromisso de última hora sem um bom motivo',
  'Eu nunca roubei algo (por menor que fosse)',
  'Eu nunca enviei uma mensagem para a pessoa errada',
  'Eu nunca espriei o perfil de alguém sem seguir',
  'Eu nunca fiz algo só pelo dinheiro que me arrependi depois',
  'Eu nunca tirei uma selfie e apaguei porque não gostei',
  'Eu nunca fingi que não vi uma mensagem',
  'Eu nunca comei a sobremesa antes do prato principal',
  'Eu nunca chorei num filme que "não era para chorar"',
  'Eu nunca menti sobre ter lido o livro / assistido o filme',
  'Eu nunca cantei em frente ao espelho como se fosse um show',
  'Eu nunca fiz xixi na piscina',
  'Eu nunca coei o passado de alguém antes do primeiro date',
  'Eu nunca dei uma desculpa inventada para não ir a uma festa',
  'Eu nunca ri de uma piada que não entendi só para não parecer perdido',
  'Eu nunca passei mais de 30 min escolhendo o que assistir no streaming sem assistir nada',
  'Eu nunca guardei uma roupa "para uma ocasião especial" que nunca chegou',
  'Eu nunca procurei meu próprio nome no Google',
  'Eu nunca fiz declaração de amor e me arrependi',
  'Eu nunca fui sozinho(a) ao cinema',
  'Eu nunca terminei um relacionamento por mensagem',
  'Eu nunca bebi diretamente da garrafa no meio da noite',
]

function shuffleFn<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Phase = 'setup' | 'playing' | 'end'

interface Player {
  name: string
  drinks: number
}

interface NeverStatement { text: string; source: 'system' | 'player' }

// ─── Componente principal ────────────────────────────────────────────────────

export default function EuNuncaGame() {
  const navigate = useNavigate()
  const tutorial = useGameTutorial('eununca', TUTORIAL_STEPS)
  const [phase, setPhase]   = useState<Phase>('setup')
  const [p, setP]           = useState<[Player, Player]>([{ name: '', drinks: 0 }, { name: '', drinks: 0 }])
  const [queue, setQueue]   = useState<NeverStatement[]>(() => shuffleFn(SYSTEM_PROMPTS).map(t => ({ text: t, source: 'system' })))
  const [usedIdx, setUsedIdx] = useState(0)
  const [custom, setCustom] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [history, setHistory] = useState<{ stmt: NeverStatement; drinks: [boolean, boolean] }[]>([])
  const [currentDrinks, setCurrentDrinks] = useState<[boolean, boolean]>([false, false])
  const [revealed, setRevealed] = useState(false)

  const currentStmt = queue[usedIdx] ?? null

  function addCustom() {
    if (!custom.trim()) return
    setQueue(q => [...q, { text: custom.trim(), source: 'player' }])
    setCustom('')
    setShowAddForm(false)
  }

  function nextStatement() {
    // Salva histórico
    if (currentStmt) {
      setHistory(h => [...h, { stmt: currentStmt, drinks: currentDrinks }])
    }
    // Atualiza pontuação de bebidas
    setP(prev => {
      const u = [...prev] as [Player, Player]
      if (currentDrinks[0]) u[0] = { ...u[0], drinks: u[0].drinks + 1 }
      if (currentDrinks[1]) u[1] = { ...u[1], drinks: u[1].drinks + 1 }
      return u
    })
    setCurrentDrinks([false, false])
    setRevealed(false)
    if (usedIdx + 1 >= queue.length) {
      setPhase('end')
    } else {
      setUsedIdx(i => i + 1)
    }
  }

  function shuffle() {
    setQueue(q => shuffleFn(q))
    setUsedIdx(0)
    setCurrentDrinks([false, false])
    setRevealed(false)
  }

  function restart() {
    setPhase('setup')
    setQueue(shuffleFn(SYSTEM_PROMPTS).map(t => ({ text: t, source: 'system' })))
    setUsedIdx(0)
    setP([{ name: '', drinks: 0 }, { name: '', drinks: 0 }])
    setHistory([])
    setCurrentDrinks([false, false])
    setRevealed(false)
  }

  // ─── Telas ──────────────────────────────────────────────────────────────────

  function renderContent() {
    if (phase === 'setup') {
      return (
        <Shell title="Eu Nunca" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial}>
          <div className="max-w-sm mx-auto p-5 flex flex-col gap-5">
            <div className="card p-4 bg-stone-900 text-white">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Como funciona</p>
              <p className="text-sm text-stone-300 leading-relaxed">
                Uma frase "Eu nunca..." aparece. Quem já fez levanta o dedo (ou bebe). As frases vêm do sistema ou de vocês mesmos.
              </p>
            </div>
            <div className="card p-3 bg-amber-50 border-amber-200 flex items-start gap-2">
              <span className="text-amber-500 text-base leading-none mt-0.5">👥</span>
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Somente presencial.</strong> Os dois precisam estar juntos para revelar e marcar quem bebe no mesmo aparelho.
              </p>
            </div>
            {[0, 1].map(i => (
              <div key={i} className="card p-4 space-y-2">
                <p className="text-xs font-semibold text-stone-400 uppercase">Jogador {i + 1}</p>
                <input
                  className="input"
                  placeholder={`Nome do jogador ${i + 1}`}
                  value={p[i].name}
                  maxLength={20}
                  onChange={e => setP(prev => {
                    const u = [...prev] as [Player, Player]
                    u[i] = { ...u[i], name: e.target.value }
                    return u
                  })}
                />
              </div>
            ))}

            {/* Adicionar frases customizadas antes de começar */}
            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold text-stone-400 uppercase">Suas frases ({queue.filter(q => q.source === 'player').length} adicionadas)</p>
              {showAddForm ? (
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Eu nunca..."
                    value={custom}
                    onChange={e => setCustom(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustom()}
                  />
                  <button onClick={addCustom} disabled={!custom.trim()} className="btn-primary px-3 disabled:opacity-40">
                    <Plus size={15} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowAddForm(true)} className="btn-secondary w-full justify-center text-sm">
                  <Plus size={13} />
                  Adicionar sua frase
                </button>
              )}
            </div>

            <button
              onClick={() => { if (p[0].name.trim() && p[1].name.trim()) setPhase('playing') }}
              disabled={!p[0].name.trim() || !p[1].name.trim()}
              className="btn-primary justify-center py-3 disabled:opacity-40"
            >
              <X size={16} />
              Começar
            </button>
          </div>
        </Shell>
      )
    }

    if (phase === 'playing') {
      return (
        <Shell title="Eu Nunca" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial}>
          <div className="max-w-sm mx-auto p-5 flex flex-col gap-4">
            {/* Placar de bebidas */}
            <div className="grid grid-cols-2 gap-3">
              {p.map((pl, i) => (
                <div key={i} className="card p-3 text-center">
                  <p className="text-xs font-bold text-stone-400 uppercase">{pl.name}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Beer size={14} className="text-amber-500" />
                    <span className="text-xl font-bold text-stone-900">{pl.drinks}</span>
                  </div>
                </div>
              ))}
            </div>

            {currentStmt && (
              <div className={`card p-5 text-center ${currentStmt.source === 'player' ? 'bg-violet-50 border-violet-200' : 'bg-stone-900 text-white'}`}>
                {currentStmt.source === 'player' && (
                  <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wide block mb-2">Criada por vocês</span>
                )}
                <p className={`text-xl font-bold leading-snug ${currentStmt.source === 'player' ? 'text-stone-900' : 'text-white'}`}>
                  {currentStmt.text}
                </p>
              </div>
            )}

            {!revealed ? (
              <button onClick={() => setRevealed(true)} className="btn-primary justify-center py-3">
                Revelar e marcar quem bebeu
              </button>
            ) : (
              <div className="card p-4 space-y-3">
                <p className="text-xs font-semibold text-stone-400 uppercase">Quem já fez? (bebe)</p>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1].map(i => (
                    <button
                      key={i}
                      onClick={() => setCurrentDrinks(prev => {
                        const u = [...prev] as [boolean, boolean]
                        u[i] = !u[i]
                        return u
                      })}
                      className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                        currentDrinks[i]
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'border-stone-200 text-stone-600 hover:border-amber-300'
                      }`}
                    >
                      {p[i].name}
                      {currentDrinks[i] && ' (bebe)'}
                    </button>
                  ))}
                </div>
                <button onClick={nextStatement} className="btn-primary w-full justify-center">
                  Próxima frase
                </button>
              </div>
            )}

            {/* Ações secundárias */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(a => !a)}
                className="btn-secondary flex-1 justify-center text-xs"
              >
                <Plus size={12} />
                Adicionar frase
              </button>
              <button onClick={shuffle} className="btn-secondary flex-1 justify-center text-xs">
                <Shuffle size={12} />
                Embaralhar
              </button>
            </div>

            {showAddForm && (
              <div className="card p-3 space-y-2">
                <p className="text-xs font-semibold text-stone-400 uppercase">Nova frase</p>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Eu nunca..."
                    value={custom}
                    onChange={e => setCustom(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustom()}
                  />
                  <button onClick={addCustom} disabled={!custom.trim()} className="btn-primary px-3 disabled:opacity-40">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-stone-400 text-center">{usedIdx + 1} / {queue.length} frases</p>
          </div>
        </Shell>
      )
    }

    // END
    const mostDrinks = p[0].drinks > p[1].drinks ? p[0].name : p[1].drinks > p[0].drinks ? p[1].name : null
    return (
      <Shell title="Eu Nunca" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial}>
        <div className="max-w-sm mx-auto p-5 flex flex-col gap-4 items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Beer size={28} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-stone-900">Fim do jogo!</p>
            {mostDrinks && (
              <p className="text-sm text-stone-500 mt-1">
                {mostDrinks} bebeu mais — mas também viveu mais!
              </p>
            )}
          </div>
          <div className="w-full card p-4 space-y-2 text-left">
            <p className="text-xs font-bold text-stone-400 uppercase mb-2">Placar</p>
            {p.map(pl => (
              <div key={pl.name} className="flex items-center justify-between">
                <span className="text-sm text-stone-700">{pl.name}</span>
                <div className="flex items-center gap-1">
                  <Beer size={13} className="text-amber-500" />
                  <span className="text-sm font-bold">{pl.drinks}</span>
                </div>
              </div>
            ))}
          </div>

          {history.length > 0 && (
            <div className="w-full card p-4 text-left space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs font-bold text-stone-400 uppercase">Histórico</p>
              {history.map((h, i) => (
                <div key={i} className="text-xs text-stone-600 py-1.5 border-b border-stone-100 last:border-0">
                  <span className="font-semibold">{h.stmt.text}</span>
                  <span className="text-stone-400 ml-1">
                    {h.drinks[0] && h.drinks[1] ? ` — os dois beberam` :
                     h.drinks[0] ? ` — ${p[0].name} bebeu` :
                     h.drinks[1] ? ` — ${p[1].name} bebeu` : ' — ninguém bebeu'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button onClick={restart} className="btn-primary justify-center w-full py-3">
            <RefreshCw size={14} />
            Jogar novamente
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <>
      <GameTutorial
        open={tutorial.open}
        steps={tutorial.steps}
        stepIdx={tutorial.stepIdx}
        onClose={tutorial.close}
        onNext={tutorial.next}
        onPrev={tutorial.prev}
        accentColor="bg-stone-900"
        accentBorder="border-stone-200"
        accentBg="bg-stone-50"
        accentText="text-stone-700"
      />
      {renderContent()}
    </>
  )
}

function Shell({
  title,
  onBack,
  onHelp,
  children,
}: {
  title: string
  onBack: () => void
  onHelp: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 pt-5 pb-3 md:px-7 md:pt-6 border-b border-stone-100 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors shrink-0">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-semibold text-stone-900 flex-1">{title}</h1>
          <button
            onClick={onHelp}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors shrink-0 text-stone-400 hover:text-stone-700"
            aria-label="Ver tutorial"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-24 md:pb-0">{children}</div>
    </div>
  )
}
