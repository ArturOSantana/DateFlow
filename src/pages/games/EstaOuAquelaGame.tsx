import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Layers, RefreshCw, Trophy, Shuffle, HelpCircle } from 'lucide-react'
import { useGameTutorial } from '../../hooks/useGameTutorial'
import { useGameSession } from '../../hooks/useGameSession'
import GameTutorial from '../../components/GameTutorial'
import { SetupRoom, WaitingRoom } from '../../components/GameRoom'

// ─── Tutorial ─────────────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    title: 'Bem-vindos ao Esta ou Aquela?',
    text: 'Dois cenários aparecem na tela. Cada um escolhe um dos dois e justifica a escolha em uma frase.',
  },
  {
    title: 'Como jogar remotamente',
    text: 'Um cria a sala e manda o código. O outro entra com o código — cada um no próprio celular.',
  },
  {
    title: 'Debate',
    text: 'Após escolherem, cada um tem 30 segundos para convencer o outro de que sua opção é melhor.',
  },
  {
    title: 'Votação',
    text: 'Cada um vota em quem convenceu melhor — não pode votar em si mesmo! Quem ganhar mais votos leva 1 ponto.',
  },
]

// ─── Dados ────────────────────────────────────────────────────────────────────

const SCENARIOS: [string, string][] = [
  ['Estar em uma ilha deserta com livros', 'Estar em uma ilha deserta com música'],
  ['Ter superpoder de voar', 'Ter superpoder de invisibilidade'],
  ['Acordar 2h mais cedo por dia', 'Dormir 2h mais tarde por dia'],
  ['Morar em uma cidade barulhenta e agitada', 'Morar em uma cidade tranquila e pequena'],
  ['Viajar o mundo sem conforto', 'Ficar num só lugar com todo conforto'],
  ['Ter acesso a todo o conhecimento do mundo', 'Ter acesso a todo o dinheiro do mundo'],
  ['Ser amado sem amar', 'Amar sem ser amado'],
  ['Lembrar de tudo', 'Esquecer tudo de ruim'],
  ['Falar muitos idiomas', 'Tocar qualquer instrumento'],
  ['Ter muitos amigos superficiais', 'Ter poucos amigos de verdade'],
  ['Ser famoso', 'Ser rico em segredo'],
  ['Viver no passado nostálgico', 'Viver no futuro tecnológico'],
  ['Ter coragem de qualquer coisa', 'Ter calma em qualquer situação'],
  ['Trabalhar no que ama sem ganhar muito', 'Trabalhar no que não gosta ganhando muito'],
  ['Ser muito inteligente mas impulsivo', 'Ser moderado mas equilibrado'],
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Phase = 'choosing' | 'debate' | 'vote' | 'result' | 'end'

interface GameState {
  phase: Phase
  scenarioList: [string, string][]
  sIdx: number
  roundNum: number
  p1Choice: 0 | 1 | null
  p2Choice: 0 | 1 | null
  p1Justification: string
  p2Justification: string
  p1DebateText: string
  p2DebateText: string
  p1Vote: 0 | 1 | null
  p2Vote: 0 | 1 | null
  p1Score: number
  p2Score: number
  roundWinner: 0 | 1 | 'tie' | null
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EstaOuAquelaGame() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tutorial = useGameTutorial('estaouaquela', TUTORIAL_STEPS)
  const rm = useGameSession<GameState>('estaouaquela')
  const { screen, session, myRole, gameState, loading, error } = rm

  const isP1 = myRole === 'p1'
  const p1Name = session?.p1Name ?? 'Jogador 1'
  const p2Name = session?.p2Name ?? 'Jogador 2'

  async function handleCreate(name: string) {
    const initial: GameState = {
      phase: 'choosing',
      scenarioList: shuffle(SCENARIOS),
      sIdx: 0,
      roundNum: 0,
      p1Choice: null, p2Choice: null,
      p1Justification: '', p2Justification: '',
      p1DebateText: '', p2DebateText: '',
      p1Vote: null, p2Vote: null,
      p1Score: 0, p2Score: 0,
      roundWinner: null,
    }
    await rm.handleCreate(name, initial)
  }

  async function handleJoin(name: string, code: string) {
    await rm.handleJoin(name, code)
  }

  async function setChoice(choice: 0 | 1) {
    if (!gameState) return
    const next = { ...gameState }
    if (isP1) next.p1Choice = choice
    else      next.p2Choice = choice
    // Ambos escolheram → vai para debate
    if (next.p1Choice !== null && next.p2Choice !== null) next.phase = 'debate'
    await rm.pushState(next)
  }

  async function setJustification(text: string) {
    if (!gameState) return
    const next = { ...gameState }
    if (isP1) next.p1Justification = text
    else      next.p2Justification = text
    await rm.pushState(next)
  }

  async function setDebateText(text: string) {
    if (!gameState) return
    const next = { ...gameState }
    if (isP1) next.p1DebateText = text
    else      next.p2DebateText = text
    await rm.pushState(next)
  }

  async function goVote() {
    if (!gameState) return
    await rm.pushState({ ...gameState, phase: 'vote', p1Vote: null, p2Vote: null })
  }

  async function submitVote(vote: 0 | 1) {
    if (!gameState) return
    const next = { ...gameState }
    if (isP1) next.p1Vote = vote
    else      next.p2Vote = vote

    if (next.p1Vote !== null && next.p2Vote !== null) {
      const counts = [0, 0]
      counts[next.p1Vote]++
      counts[next.p2Vote]++
      let w: 0 | 1 | 'tie'
      if (counts[0] > counts[1]) { w = 0; next.p1Score += 1 }
      else if (counts[1] > counts[0]) { w = 1; next.p2Score += 1 }
      else w = 'tie'
      next.roundWinner = w
      next.phase = 'result'
    }
    await rm.pushState(next)
  }

  async function nextRound() {
    if (!gameState) return
    await rm.pushState({
      ...gameState,
      phase: 'choosing',
      sIdx: gameState.sIdx + 1,
      roundNum: gameState.roundNum + 1,
      p1Choice: null, p2Choice: null,
      p1Justification: '', p2Justification: '',
      p1DebateText: '', p2DebateText: '',
      p1Vote: null, p2Vote: null,
      roundWinner: null,
    })
  }

  async function endGame() {
    if (!gameState) return
    await rm.pushState({ ...gameState, phase: 'end' })
  }

  async function restart() {
    if (!gameState) return
    await rm.pushState({
      phase: 'choosing',
      scenarioList: shuffle(SCENARIOS),
      sIdx: 0,
      roundNum: 0,
      p1Choice: null, p2Choice: null,
      p1Justification: '', p2Justification: '',
      p1DebateText: '', p2DebateText: '',
      p1Vote: null, p2Vote: null,
      p1Score: 0, p2Score: 0,
      roundWinner: null,
    })
  }

  // ─── Setup / Waiting ──────────────────────────────────────────────────────────

  if (screen === 'setup') {
    const initialCode = searchParams.get('code') ?? undefined
    return (
      <>
        <GameTutorial open={tutorial.open} steps={tutorial.steps} stepIdx={tutorial.stepIdx}
          onClose={tutorial.close} onNext={tutorial.next} onPrev={tutorial.prev}
          accentColor="bg-amber-500" accentBorder="border-amber-200" accentBg="bg-amber-50" accentText="text-amber-900" />
        <div className="flex flex-col min-h-full">
          <TopBar title="Esta ou Aquela?" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial} />
          <div className="flex-1 overflow-y-auto">
            <SetupRoom
              title="Esta ou Aquela?"
              accentColor="bg-amber-100"
              icon={<Layers size={28} className="text-amber-600" />}
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
        <TopBar title="Esta ou Aquela?" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial} />
        <div className="flex-1 overflow-y-auto">
          <WaitingRoom code={session!.code} gamePath="/ideas/games/estaouaquela" onCancel={() => navigate('/ideas/games')} />
        </div>
      </div>
    )
  }

  if (!gameState) return null
  const gs = gameState
  const scenario = gs.scenarioList[gs.sIdx % gs.scenarioList.length]

  const myChoice = isP1 ? gs.p1Choice : gs.p2Choice
  const myJustification = isP1 ? gs.p1Justification : gs.p2Justification
  const myVote = isP1 ? gs.p1Vote : gs.p2Vote

  function renderPlaying() {
    // ── Choosing ─────────────────────────────────────────────────────────────
    if (gs.phase === 'choosing') {
      return (
        <div className="max-w-sm mx-auto p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-semibold uppercase">Rodada {gs.roundNum + 1}</span>
            {isP1 && (
              <button onClick={() => rm.pushState({ ...gs, sIdx: gs.sIdx + 1 })} className="btn-ghost py-1 px-2 text-xs">
                <Shuffle size={12} />
                Outro cenário
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map(c => (
              <div key={c} className="card p-4 text-center text-sm font-semibold text-stone-800">
                {scenario[c as 0 | 1]}
              </div>
            ))}
          </div>

          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold text-stone-400 uppercase">{isP1 ? p1Name : p2Name}</p>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map(c => (
                <button
                  key={c}
                  onClick={() => setChoice(c as 0 | 1)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    myChoice === c ? 'bg-amber-500 text-white border-amber-500' : 'border-stone-200 text-stone-600 hover:border-amber-300'
                  }`}
                >
                  Opção {c + 1}
                </button>
              ))}
            </div>
            {myChoice !== null && (
              <textarea
                className="textarea text-sm"
                rows={2}
                placeholder="Justifique em uma frase..."
                value={myJustification}
                onChange={e => setJustification(e.target.value)}
              />
            )}
          </div>

          <div className="text-xs text-stone-400 text-center">
            {(isP1 ? gs.p2Choice : gs.p1Choice) !== null
              ? <span className="text-emerald-600 font-semibold">{isP1 ? p2Name : p1Name} já escolheu</span>
              : <span>{isP1 ? p2Name : p1Name} está escolhendo...</span>
            }
          </div>
        </div>
      )
    }

    // ── Debate ───────────────────────────────────────────────────────────────
    if (gs.phase === 'debate') {
      return (
        <div className="max-w-sm mx-auto p-5 flex flex-col gap-4">
          <p className="text-sm font-semibold text-stone-700 text-center">Debate — cada um tem 30 s para convencer o outro</p>
          {[
            { name: p1Name, choice: gs.p1Choice, just: gs.p1Justification, debate: gs.p1DebateText, isMe: isP1 },
            { name: p2Name, choice: gs.p2Choice, just: gs.p2Justification, debate: gs.p2DebateText, isMe: !isP1 },
          ].map((pl, i) => (
            <div key={i} className="card p-4 space-y-2">
              <p className="text-xs font-bold text-stone-400 uppercase">{pl.name} escolheu: {scenario[pl.choice as 0 | 1]}</p>
              <p className="text-xs text-stone-600 italic">"{pl.just}"</p>
              {pl.isMe ? (
                <textarea
                  className="textarea text-sm"
                  rows={2}
                  placeholder="Seu argumento de convencimento..."
                  value={pl.debate}
                  onChange={e => setDebateText(e.target.value)}
                />
              ) : (
                pl.debate ? <p className="text-xs text-stone-500 italic">"{pl.debate}"</p> : null
              )}
            </div>
          ))}
          {isP1 && (
            <button onClick={goVote} className="btn-primary justify-center py-3">
              Votar em quem convenceu melhor
            </button>
          )}
          {!isP1 && <p className="text-xs text-stone-400 text-center">Aguardando o host avançar...</p>}
        </div>
      )
    }

    // ── Vote ─────────────────────────────────────────────────────────────────
    if (gs.phase === 'vote') {
      return (
        <div className="max-w-sm mx-auto p-5 flex flex-col gap-4">
          <p className="text-sm font-semibold text-stone-700 text-center">Quem convenceu melhor?</p>
          {myVote !== null ? (
            <p className="text-xs text-emerald-600 font-semibold text-center">Voto enviado. Aguardando...</p>
          ) : (
            <div className="space-y-2">
              {[0, 1].map(choice => (
                <button
                  key={choice}
                  onClick={() => submitVote(choice as 0 | 1)}
                  className="w-full py-3 rounded-xl border text-sm font-semibold border-stone-200 hover:bg-amber-50 hover:border-amber-300 transition-all"
                >
                  {choice === 0 ? p1Name : p2Name}
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }

    // ── Result ───────────────────────────────────────────────────────────────
    if (gs.phase === 'result') {
      return (
        <div className="max-w-sm mx-auto p-5 flex flex-col gap-4 text-center">
          <div className={`card p-4 ${gs.roundWinner === 'tie' ? 'bg-stone-50' : 'bg-amber-50 border-amber-200'}`}>
            <p className="text-lg font-bold text-stone-900">
              {gs.roundWinner === 'tie' ? 'Empate — ambos convenceram igual!' : `${gs.roundWinner === 0 ? p1Name : p2Name} convenceu mais!`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: p1Name, choice: gs.p1Choice, score: gs.p1Score },
              { name: p2Name, choice: gs.p2Choice, score: gs.p2Score },
            ].map((pl, i) => (
              <div key={i} className="card p-3 text-center">
                <p className="text-xs font-bold text-stone-400 uppercase">{pl.name}</p>
                <p className="text-sm font-semibold text-stone-700 mt-1">{scenario[pl.choice as 0 | 1]}</p>
                <p className="text-lg font-bold mt-1">{pl.score} pts</p>
              </div>
            ))}
          </div>
          {isP1 ? (
            <div className="flex gap-2">
              <button onClick={nextRound} className="btn-secondary flex-1 justify-center">Próximo cenário</button>
              <button onClick={endGame} className="btn-primary flex-1 justify-center">Encerrar</button>
            </div>
          ) : (
            <p className="text-xs text-stone-400">Aguardando o host...</p>
          )}
        </div>
      )
    }

    // ── End ─────────────────────────────────────────────────────────────────
    const winner = gs.p1Score > gs.p2Score ? p1Name : gs.p2Score > gs.p1Score ? p2Name : null
    return (
      <div className="max-w-sm mx-auto p-5 flex flex-col gap-4 items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
          <Trophy size={28} className="text-amber-600" />
        </div>
        <p className="text-xl font-bold text-stone-900">{winner ? `${winner} venceu!` : 'Empate!'}</p>
        <div className="w-full card p-4 space-y-2">
          {[{ name: p1Name, score: gs.p1Score }, { name: p2Name, score: gs.p2Score }].map(pl => (
            <div key={pl.name} className="flex justify-between">
              <span className="text-sm text-stone-700">{pl.name}</span>
              <span className="text-sm font-bold">{pl.score} debates ganhos</span>
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
        accentColor="bg-amber-500" accentBorder="border-amber-200" accentBg="bg-amber-50" accentText="text-amber-900" />
      <div className="flex flex-col min-h-full">
        <TopBar title="Esta ou Aquela?" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial} />
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
