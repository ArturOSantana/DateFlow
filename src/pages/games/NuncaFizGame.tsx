import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MousePointerClick, RefreshCw, Trophy, CheckCircle, HelpCircle } from 'lucide-react'
import { useGameTutorial } from '../../hooks/useGameTutorial'
import { useGameSession } from '../../hooks/useGameSession'
import GameTutorial from '../../components/GameTutorial'
import { SetupRoom, WaitingRoom } from '../../components/GameRoom'

// ─── Tutorial ─────────────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    title: 'Bem-vindos ao Nunca Fiz, Mas Faria!',
    text: 'Uma atividade aparece na tela. Cada um responde com: "Nunca Fiz", "Já Fiz" ou "Faria". As respostas são reveladas ao mesmo tempo.',
  },
  {
    title: 'Como jogar remotamente',
    text: 'Um cria a sala e manda o código. O outro entra com o código — cada um no próprio celular.',
  },
  {
    title: 'Pontuação dupla',
    text: 'Respostas diferentes = +1 ponto de Diversidade. Respostas iguais = +1 ponto de Sintonia. Não existe resposta certa ou errada!',
  },
]

// ─── Dados ────────────────────────────────────────────────────────────────────

const ACTIVITIES = [
  'Pular de paraquedas',
  'Viajar sozinho(a) para outro país',
  'Comer inseto',
  'Tatuar o nome de alguém',
  'Dormir em um aeroporto',
  'Subir em uma montanha acima de 3.000m',
  'Assistir o nascer do sol na praia',
  'Falar em público para mais de 100 pessoas',
  'Morar em outro país por mais de 6 meses',
  'Fazer bungee jump',
  'Ir a um show de um artista que não conhecia',
  'Cozinhar uma refeição inteira do zero para alguém',
  'Mergulhar no oceano aberto',
  'Dirigir por mais de 5 horas seguidas',
  'Fazer uma viagem sem nenhum planejamento',
  'Aprender um instrumento musical',
  'Ficar sem celular por uma semana inteira',
  'Fazer uma tatuagem',
  'Andar de moto em estrada',
  'Assistir o amanhecer depois de uma noite em claro',
  'Acampar na natureza',
  'Conhecer alguém pela internet e virar amigo(a) de verdade',
  'Escrever uma carta para o eu do futuro',
  'Participar de uma competição esportiva',
  'Abraçar um estranho',
]

type Answer = 'NUNCA FIZ' | 'JÁ FIZ' | 'FARIA'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Phase = 'round' | 'result' | 'end'

interface GameState {
  phase: Phase
  activityList: string[]
  actIdx: number
  p1Answer: Answer | null
  p2Answer: Answer | null
  p1Score: number    // diversidade
  p2Score: number    // diversidade
  syntonyScore: number
  nextActivityChoice: string | null
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function NuncaFizGame() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tutorial = useGameTutorial('nuncafiz', TUTORIAL_STEPS)
  const rm = useGameSession<GameState>('nuncafiz')
  const { screen, session, myRole, gameState, loading, error } = rm

  const isP1 = myRole === 'p1'
  const p1Name = session?.p1Name ?? 'Jogador 1'
  const p2Name = session?.p2Name ?? 'Jogador 2'

  async function handleCreate(name: string) {
    const initial: GameState = {
      phase: 'round',
      activityList: shuffle(ACTIVITIES),
      actIdx: 0,
      p1Answer: null,
      p2Answer: null,
      p1Score: 0,
      p2Score: 0,
      syntonyScore: 0,
      nextActivityChoice: null,
    }
    await rm.handleCreate(name, initial)
  }

  async function handleJoin(name: string, code: string) {
    await rm.handleJoin(name, code)
  }

  async function submitAnswer(ans: Answer) {
    if (!gameState) return
    const next = { ...gameState }
    if (isP1) next.p1Answer = ans
    else      next.p2Answer = ans

    // Se os dois responderam, vai para result
    if (next.p1Answer && next.p2Answer) next.phase = 'result'
    await rm.pushState(next)
  }

  async function nextRound() {
    if (!gameState) return
    const { p1Answer, p2Answer, actIdx, activityList } = gameState
    const diff = p1Answer !== p2Answer
    const same = p1Answer === p2Answer
    const isLast = actIdx + 1 >= activityList.length

    const next: GameState = {
      ...gameState,
      p1Answer: null,
      p2Answer: null,
      nextActivityChoice: null,
      p1Score: gameState.p1Score + (diff ? 1 : 0),
      p2Score: gameState.p2Score + (diff ? 1 : 0),
      syntonyScore: gameState.syntonyScore + (same ? 1 : 0),
      actIdx: actIdx + 1,
      phase: isLast ? 'end' : 'round',
    }
    await rm.pushState(next)
  }

  async function saveLeaderChoice(text: string) {
    if (!gameState) return
    await rm.pushState({ ...gameState, nextActivityChoice: text })
  }

  async function restart() {
    if (!gameState) return
    await rm.pushState({
      phase: 'round',
      activityList: shuffle(ACTIVITIES),
      actIdx: 0,
      p1Answer: null,
      p2Answer: null,
      p1Score: 0,
      p2Score: 0,
      syntonyScore: 0,
      nextActivityChoice: null,
    })
  }

  // ─── Setup / Waiting ──────────────────────────────────────────────────────────

  if (screen === 'setup') {
    const initialCode = searchParams.get('code') ?? undefined
    return (
      <>
        <GameTutorial open={tutorial.open} steps={tutorial.steps} stepIdx={tutorial.stepIdx}
          onClose={tutorial.close} onNext={tutorial.next} onPrev={tutorial.prev}
          accentColor="bg-emerald-600" accentBorder="border-emerald-200" accentBg="bg-emerald-50" accentText="text-emerald-800" />
        <div className="flex flex-col min-h-full">
          <TopBar title="Nunca Fiz, Mas Faria" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial} />
          <div className="flex-1 overflow-y-auto">
            <SetupRoom
              title="Nunca Fiz, Mas Faria"
              accentColor="bg-emerald-100"
              icon={<MousePointerClick size={28} className="text-emerald-600" />}
              loading={loading}
              error={error}
              onCreateRoom={handleCreate}
              onJoinRoom={handleJoin}
              initialCode={initialCode}
            />
          </div>
        </div>
      </>
    )
  }

  if (screen === 'waiting') {
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="Nunca Fiz, Mas Faria" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial} />
        <div className="flex-1 overflow-y-auto">
          <WaitingRoom code={session!.code} gamePath="/ideas/games/nuncafiz" onCancel={() => navigate('/ideas/games')} />
        </div>
      </div>
    )
  }

  if (!gameState) return null
  const gs = gameState
  const activity = gs.activityList[gs.actIdx] ?? gs.activityList[0]
  const myAnswer = isP1 ? gs.p1Answer : gs.p2Answer

  function renderPlaying() {
    // ── Round ────────────────────────────────────────────────────────────────
    if (gs.phase === 'round') {
      return (
        <div className="max-w-sm mx-auto p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-semibold uppercase">Atividade {gs.actIdx + 1}/{gs.activityList.length}</span>
            <div className="flex gap-1">
              <span className="text-xs text-emerald-600 font-bold">{gs.p1Score}pt div</span>
              <span className="text-xs text-stone-300">|</span>
              <span className="text-xs text-sky-600 font-bold">{gs.syntonyScore}pt sint</span>
            </div>
          </div>

          <div className="card p-5 bg-emerald-50 border-emerald-200 text-center">
            <p className="text-xl font-bold text-stone-900">{activity}</p>
          </div>

          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold text-stone-500 uppercase">{isP1 ? p1Name : p2Name}</p>
            {myAnswer ? (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle size={11} />
                Respondido — aguardando o outro...
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(['NUNCA FIZ', 'JÁ FIZ', 'FARIA'] as Answer[]).map(ans => (
                  <button
                    key={ans}
                    onClick={() => submitAnswer(ans)}
                    className="py-2.5 px-1 rounded-xl border text-xs font-bold transition-all border-stone-200 text-stone-600 hover:border-emerald-300"
                  >
                    {ans}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Indicador do outro */}
          <div className="text-xs text-stone-400 text-center">
            {(isP1 ? gs.p2Answer : gs.p1Answer)
              ? <span className="text-emerald-600 font-semibold">{isP1 ? p2Name : p1Name} já respondeu</span>
              : <span>{isP1 ? p2Name : p1Name} está escolhendo...</span>
            }
          </div>
        </div>
      )
    }

    // ── Result ───────────────────────────────────────────────────────────────
    if (gs.phase === 'result') {
      const same = gs.p1Answer === gs.p2Answer
      const isLast = gs.actIdx + 1 >= gs.activityList.length
      const leader = gs.p1Score > gs.p2Score ? 0 : gs.p2Score > gs.p1Score ? 1 : null

      return (
        <div className="max-w-sm mx-auto p-5 flex flex-col gap-4">
          <div className={`card p-4 text-center ${same ? 'bg-sky-50 border-sky-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className="text-sm font-bold">{same ? 'Sintonia! Respostas iguais.' : 'Diversidade! Respostas diferentes.'}</p>
            <p className="text-xs text-stone-500 mt-1">{same ? '+1 ponto de sintonia para cada um' : '+1 ponto de diversidade para cada um'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { name: p1Name, answer: gs.p1Answer },
              { name: p2Name, answer: gs.p2Answer },
            ].map(pl => (
              <div key={pl.name} className="card p-3 text-center">
                <p className="text-xs font-bold text-stone-400 uppercase">{pl.name}</p>
                <p className={`text-lg font-bold mt-1 ${
                  pl.answer === 'NUNCA FIZ' ? 'text-stone-600' :
                  pl.answer === 'JÁ FIZ' ? 'text-emerald-600' : 'text-sky-600'
                }`}>{pl.answer}</p>
              </div>
            ))}
          </div>

          {isLast ? (
            isP1 ? (
              <button onClick={nextRound} className="btn-primary justify-center py-3">Ver resultado final</button>
            ) : (
              <p className="text-xs text-stone-400 text-center">Aguardando o host...</p>
            )
          ) : (
            <>
              {leader !== null && (
                <div className="card p-3 bg-amber-50 border-amber-200">
                  <p className="text-xs text-stone-600">
                    <strong>{leader === 0 ? p1Name : p2Name}</strong> está liderando! Na próxima atividade, pode escolher algo que os dois façam juntos.
                  </p>
                  {isP1 && (
                    <input
                      className="input mt-2 text-sm"
                      placeholder="Ex: assistir um filme esse fim de semana..."
                      value={gs.nextActivityChoice ?? ''}
                      onChange={e => saveLeaderChoice(e.target.value)}
                    />
                  )}
                  {!isP1 && gs.nextActivityChoice && (
                    <p className="text-xs text-stone-700 mt-2 italic">"{gs.nextActivityChoice}"</p>
                  )}
                </div>
              )}
              {isP1 ? (
                <button onClick={nextRound} className="btn-primary justify-center py-3">Próxima atividade</button>
              ) : (
                <p className="text-xs text-stone-400 text-center">Aguardando o host avançar...</p>
              )}
            </>
          )}
        </div>
      )
    }

    // ── End ─────────────────────────────────────────────────────────────────
    const winner = gs.p1Score > gs.p2Score ? p1Name : gs.p2Score > gs.p1Score ? p2Name : null
    return (
      <div className="max-w-sm mx-auto p-5 flex flex-col gap-4 items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
          <Trophy size={28} className="text-emerald-600" />
        </div>
        <p className="text-xl font-bold text-stone-900">{winner ? `${winner} venceu!` : 'Empate!'}</p>
        <div className="w-full card p-4 space-y-2 text-left">
          <p className="text-xs font-bold text-stone-400 uppercase mb-2">Placar final</p>
          {[{ name: p1Name, div: gs.p1Score, sint: gs.syntonyScore },
            { name: p2Name, div: gs.p2Score, sint: gs.syntonyScore }].map(pl => (
            <div key={pl.name} className="space-y-1">
              <p className="text-sm font-semibold text-stone-800">{pl.name}</p>
              <div className="flex gap-3 text-xs text-stone-500">
                <span className="text-emerald-600 font-bold">{pl.div} pt diversidade</span>
                <span className="text-sky-600 font-bold">{pl.sint} pt sintonia</span>
              </div>
            </div>
          ))}
        </div>
        {isP1 && (
          <button onClick={restart} className="btn-primary justify-center w-full py-3">
            <RefreshCw size={14} />
            Jogar novamente
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <GameTutorial open={tutorial.open} steps={tutorial.steps} stepIdx={tutorial.stepIdx}
        onClose={tutorial.close} onNext={tutorial.next} onPrev={tutorial.prev}
        accentColor="bg-emerald-600" accentBorder="border-emerald-200" accentBg="bg-emerald-50" accentText="text-emerald-800" />
      <div className="flex flex-col min-h-full">
        <TopBar title="Nunca Fiz, Mas Faria" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial} />
        <div className="flex-1 overflow-y-auto">{renderPlaying()}</div>
      </div>
    </>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar({ title, onBack, onHelp }: { title: string; onBack: () => void; onHelp: () => void }) {
  return (
    <div className="px-4 pt-5 pb-3 md:px-7 md:pt-6 border-b border-stone-100 shrink-0">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors shrink-0">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-semibold text-stone-900 flex-1">{title}</h1>
        <button onClick={onHelp} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors shrink-0 text-stone-400 hover:text-stone-700" aria-label="Ver tutorial">
          <HelpCircle size={18} />
        </button>
      </div>
    </div>
  )
}
