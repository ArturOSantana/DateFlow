import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MessageSquare, RefreshCw, Trophy, Shuffle, HelpCircle } from 'lucide-react'
import { useGameTutorial } from '../../hooks/useGameTutorial'
import { useGameSession } from '../../hooks/useGameSession'
import GameTutorial from '../../components/GameTutorial'
import { SetupRoom, WaitingRoom } from '../../components/GameRoom'

// ─── Tutorial ─────────────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    title: 'Bem-vindos ao Complete a Frase!',
    text: 'O app sugere o início de uma frase. Cada um completa ao mesmo tempo, sem ver a resposta do outro. Depois revelam e votam.',
  },
  {
    title: 'Como jogar remotamente',
    text: 'Um cria a sala e manda o código. O outro entra com o código — cada um no próprio celular.',
  },
  {
    title: 'Respondendo',
    text: 'Cada jogador digita sua resposta. Só após os dois enviarem as respostas são reveladas.',
  },
  {
    title: 'Votando',
    text: 'Cada um vota em qual resposta foi mais corajosa. Quem ganhar mais votos recebe o Ícone de Coragem!',
  },
]

// ─── Dados ────────────────────────────────────────────────────────────────────

const PROMPTS = [
  'Nunca contei a ninguém que...',
  'Meu maior medo é...',
  'Se eu pudesse voltar no tempo, teria...',
  'A pessoa que mais me inspira é...',
  'O dia mais feliz da minha vida foi...',
  'Tenho vergonha de admitir que...',
  'O que mais quero realizar nos próximos 5 anos é...',
  'A coisa que mais me arrependio de não fazer foi...',
  'Quando estou sozinho(a), geralmente penso em...',
  'Se eu pudesse mudar uma coisa em mim, seria...',
  'O que eu sinto quando estou com você é...',
  'Minha maior conquista foi...',
  'O que ninguém imagina sobre mim é...',
  'O que mais me traz paz é...',
  'Uma coisa que me envergonha mas acho engraçado é...',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Phase = 'writing' | 'vote' | 'explain' | 'end'

interface PlayerAnswers {
  p1: string
  p2: string
  p1Submitted: boolean
  p2Submitted: boolean
  p1Vote: 0 | 1 | null   // 0 = votou em p1, 1 = votou em p2
  p2Vote: 0 | 1 | null
  p1Score: number
  p2Score: number
}

interface GameState {
  phase: Phase
  prompt: string
  round: number
  answers: PlayerAnswers
  roundWinner: 0 | 1 | 'tie' | null
  explainText: string
}

function freshAnswers(prev?: PlayerAnswers): PlayerAnswers {
  return {
    p1: '', p2: '',
    p1Submitted: false, p2Submitted: false,
    p1Vote: null, p2Vote: null,
    p1Score: prev?.p1Score ?? 0,
    p2Score: prev?.p2Score ?? 0,
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FraseGame() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tutorial = useGameTutorial('frase', TUTORIAL_STEPS)
  const rm = useGameSession<GameState>('frase')
  const { screen, session, myRole, gameState, loading, error } = rm

  const isP1 = myRole === 'p1'
  const p1Name = session?.p1Name ?? 'Jogador 1'
  const p2Name = session?.p2Name ?? 'Jogador 2'

  // Estado local para o campo de texto da resposta (não vai pro Firestore até enviar)
  const [localAnswerText, setLocalAnswerText] = useState('')

  async function handleCreate(name: string) {
    const initial: GameState = {
      phase: 'writing',
      prompt: pickRandom(PROMPTS),
      round: 1,
      answers: freshAnswers(),
      roundWinner: null,
      explainText: '',
    }
    await rm.handleCreate(name, initial)
  }

  async function handleJoin(name: string, code: string) {
    await rm.handleJoin(name, code)
  }

  // Jogador envia resposta
  async function submitAnswer(text: string) {
    if (!gameState) return
    const a = { ...gameState.answers }
    if (isP1) { a.p1 = text; a.p1Submitted = true }
    else       { a.p2 = text; a.p2Submitted = true }
    const next: GameState = { ...gameState, answers: a }
    // Se os dois enviaram, vai para voto
    if (a.p1Submitted && a.p2Submitted) next.phase = 'vote'
    await rm.pushState(next)
  }

  // Jogador vota
  async function submitVote(vote: 0 | 1) {
    if (!gameState) return
    const a = { ...gameState.answers }
    if (isP1) a.p1Vote = vote
    else      a.p2Vote = vote

    let roundWinner = gameState.roundWinner
    let nextPhase: Phase = 'vote'
    let p1Score = a.p1Score
    let p2Score = a.p2Score

    if (a.p1Vote !== null && a.p2Vote !== null) {
      // Conta votos para p1 e p2
      const votesForP1 = [a.p1Vote, a.p2Vote].filter(v => v === 0).length
      const votesForP2 = [a.p1Vote, a.p2Vote].filter(v => v === 1).length
      if (votesForP1 > votesForP2) { roundWinner = 0; p1Score += 1 }
      else if (votesForP2 > votesForP1) { roundWinner = 1; p2Score += 1 }
      else roundWinner = 'tie'

      a.p1Score = p1Score
      a.p2Score = p2Score

      nextPhase = roundWinner !== 'tie' ? 'explain' : 'vote'
    }

    const next: GameState = {
      ...gameState,
      answers: a,
      roundWinner,
      phase: nextPhase,
    }
    await rm.pushState(next)
  }

  // Host confirma explain e avança para próxima rodada
  async function nextRound() {
    if (!gameState) return
    const next: GameState = {
      ...gameState,
      phase: 'writing',
      prompt: pickRandom(PROMPTS),
      round: gameState.round + 1,
      answers: freshAnswers(gameState.answers),
      roundWinner: null,
      explainText: '',
    }
    await rm.pushState(next)
  }

  async function endGame() {
    if (!gameState) return
    await rm.pushState({ ...gameState, phase: 'end' })
  }

  async function saveExplain(text: string) {
    if (!gameState) return
    await rm.pushState({ ...gameState, explainText: text })
  }

  async function restart() {
    if (!gameState) return
    await rm.pushState({
      phase: 'writing',
      prompt: pickRandom(PROMPTS),
      round: 1,
      answers: freshAnswers(),
      roundWinner: null,
      explainText: '',
    })
  }

  // ─── Setup / Waiting ──────────────────────────────────────────────────────────

  if (screen === 'setup') {
    const initialCode = searchParams.get('code') ?? undefined
    return (
      <>
        <GameTutorial open={tutorial.open} steps={tutorial.steps} stepIdx={tutorial.stepIdx}
          onClose={tutorial.close} onNext={tutorial.next} onPrev={tutorial.prev}
          accentColor="bg-sky-600" accentBorder="border-sky-200" accentBg="bg-sky-50" accentText="text-sky-800" />
        <div className="flex flex-col min-h-full">
          <TopBar title="Complete a Frase" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial} />
          <div className="flex-1 overflow-y-auto">
            <SetupRoom
              title="Complete a Frase"
              accentColor="bg-sky-100"
              icon={<MessageSquare size={28} className="text-sky-600" />}
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
        <TopBar title="Complete a Frase" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial} />
        <div className="flex-1 overflow-y-auto">
          <WaitingRoom code={session!.code} gamePath="/ideas/games/frase" onCancel={() => navigate('/ideas/games')} />
        </div>
      </div>
    )
  }

  if (!gameState) return null
  const gs = gameState
  const a = gs.answers

  // ─── Fases do jogo ───────────────────────────────────────────────────────────

  function renderPlaying() {
    // ── Writing ─────────────────────────────────────────────────────────────
    if (gs.phase === 'writing') {
      const mySubmitted = isP1 ? a.p1Submitted : a.p2Submitted

      return (
        <div className="max-w-sm mx-auto p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="card px-3 py-1.5 bg-sky-50 border-sky-200 flex-1">
              <p className="text-xs text-stone-500 uppercase font-bold tracking-wide">Complete:</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5 italic">"{gs.prompt}"</p>
            </div>
            {isP1 && (
              <button onClick={() => rm.pushState({ ...gs, prompt: pickRandom(PROMPTS) })} className="ml-2 btn-secondary shrink-0 px-2 py-2">
                <Shuffle size={14} />
              </button>
            )}
          </div>

          <div className="card p-4 space-y-2">
            <p className="text-xs font-semibold text-stone-400 uppercase">{isP1 ? p1Name : p2Name}</p>
            {mySubmitted ? (
              <p className="text-xs text-emerald-600 font-semibold">Resposta enviada. Aguardando o outro...</p>
            ) : (
              <>
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="Sua resposta (máx. 30 palavras)..."
                  value={localAnswerText}
                  onChange={e => setLocalAnswerText(e.target.value)}
                  maxLength={200}
                />
                <button
                  onClick={() => submitAnswer(localAnswerText)}
                  disabled={!localAnswerText.trim()}
                  className="btn-primary w-full justify-center disabled:opacity-40"
                >
                  Enviar resposta
                </button>
              </>
            )}
          </div>

          {/* Indicador do outro */}
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span>{isP1 ? p2Name : p1Name}:</span>
            {(isP1 ? a.p2Submitted : a.p1Submitted)
              ? <span className="text-emerald-600 font-semibold">Resposta enviada</span>
              : <span>digitando...</span>
            }
          </div>
        </div>
      )
    }

    // ── Vote ────────────────────────────────────────────────────────────────
    if (gs.phase === 'vote') {
      const myVote = isP1 ? a.p1Vote : a.p2Vote

      return (
        <div className="max-w-sm mx-auto p-5 flex flex-col gap-4">
          <p className="text-sm font-semibold text-stone-700 text-center">Qual resposta foi mais corajosa?</p>
          <div className="card p-4 space-y-2">
            <p className="text-xs font-bold text-stone-400 uppercase">{p1Name}</p>
            <p className="text-sm text-stone-800 italic">"{gs.prompt} {a.p1}"</p>
          </div>
          <div className="card p-4 space-y-2">
            <p className="text-xs font-bold text-stone-400 uppercase">{p2Name}</p>
            <p className="text-sm text-stone-800 italic">"{gs.prompt} {a.p2}"</p>
          </div>

          {myVote !== null ? (
            <p className="text-xs text-emerald-600 font-semibold text-center">Voto enviado. Aguardando...</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-stone-500 text-center">Vote na mais corajosa:</p>
              <div className="grid grid-cols-2 gap-2">
                {[0, 1].map(choice => (
                  <button
                    key={choice}
                    onClick={() => submitVote(choice as 0 | 1)}
                    className="py-2 px-3 rounded-xl border text-sm font-semibold border-stone-200 hover:bg-sky-50 hover:border-sky-300 transition-all"
                  >
                    {choice === 0 ? p1Name : p2Name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    // ── Explain ─────────────────────────────────────────────────────────────
    if (gs.phase === 'explain') {
      const winnerName = gs.roundWinner === 0 ? p1Name : p2Name
      const loserName  = gs.roundWinner === 0 ? p2Name : p1Name
      const winnerAnswer = gs.roundWinner === 0 ? a.p1 : a.p2
      const iWon = (gs.roundWinner === 0 && isP1) || (gs.roundWinner === 1 && !isP1)

      return (
        <div className="max-w-sm mx-auto p-5 flex flex-col gap-4">
          <div className="card p-4 bg-sky-50 border-sky-200 text-center">
            <p className="text-lg font-bold text-sky-700">{winnerName} ganhou!</p>
            <p className="text-sm text-stone-600 mt-1">{loserName}, você pode pedir para {winnerName} explicar melhor.</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-bold text-stone-400 uppercase mb-2">Resposta vencedora ({winnerName})</p>
            <p className="text-sm text-stone-800 italic">"{gs.prompt} {winnerAnswer}"</p>
          </div>
          {iWon && (
            <>
              <textarea className="textarea" rows={3} placeholder="Explique melhor..."
                value={gs.explainText}
                onChange={e => saveExplain(e.target.value)}
              />
            </>
          )}
          {isP1 && (
            <div className="flex gap-2">
              <button onClick={nextRound} className="btn-secondary flex-1 justify-center">Nova frase</button>
              <button onClick={endGame} className="btn-primary flex-1 justify-center">Encerrar</button>
            </div>
          )}
          {!isP1 && <p className="text-xs text-stone-400 text-center">Aguardando o host avançar...</p>}
        </div>
      )
    }

    // ── End ─────────────────────────────────────────────────────────────────
    const winner = a.p1Score > a.p2Score ? p1Name : a.p2Score > a.p1Score ? p2Name : null
    return (
      <div className="max-w-sm mx-auto p-5 flex flex-col gap-4 items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center">
          <Trophy size={28} className="text-sky-600" />
        </div>
        <p className="text-xl font-bold text-stone-900">{winner ? `${winner} venceu!` : 'Empate!'}</p>
        <p className="text-sm text-stone-500">{gs.round} {gs.round === 1 ? 'rodada' : 'rodadas'} jogadas</p>
        <div className="w-full card p-4 space-y-2">
          {[{ name: p1Name, score: a.p1Score }, { name: p2Name, score: a.p2Score }].map(pl => (
            <div key={pl.name} className="flex justify-between">
              <span className="text-sm text-stone-700">{pl.name}</span>
              <span className="text-sm font-bold">{pl.score} Ícone{pl.score !== 1 ? 's' : ''} de Coragem</span>
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
        accentColor="bg-sky-600" accentBorder="border-sky-200" accentBg="bg-sky-50" accentText="text-sky-800" />
      <div className="flex flex-col min-h-full">
        <TopBar title="Complete a Frase" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial} />
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
