import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, HelpCircle, RefreshCw, Trophy, Clock, CheckCheck } from 'lucide-react'
import { useGameTutorial } from '../../hooks/useGameTutorial'
import { useGameSession } from '../../hooks/useGameSession'
import GameTutorial from '../../components/GameTutorial'
import { SetupRoom, WaitingRoom } from '../../components/GameRoom'

// ─── Tutorial ─────────────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    title: 'Bem-vindos ao 2 Verdades, 1 Mentira!',
    text: 'Cada jogador escreve 3 afirmações sobre si mesmo: 2 verdades e 1 mentira. O outro tem 30 segundos para descobrir qual é a falsa.',
  },
  {
    title: 'Como jogar remotamente',
    text: 'Um cria a sala e manda o código. O outro entra com o código — cada um no próprio celular.',
  },
  {
    title: 'Escrevendo as afirmações',
    text: 'Preencha as 3 afirmações e marque qual delas é a mentira. Tente ser convincente!',
  },
  {
    title: 'Pontuação',
    text: 'Quem adivinhar a mentira corretamente ganha 1 ponto. Se os dois acertarem, o app pede uma verdade extra. Se os dois errarem, é o Empate Absurdo!',
  },
]

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Phase = 'writing_p1' | 'guessing_p2' | 'result_r1' | 'writing_p2' | 'guessing_p1' | 'result_r2' | 'extra' | 'surprise' | 'end'

interface PlayerData {
  name: string
  statements: [string, string, string]
  lieIndex: number
  guessedLie: number | null
  score: number
  extraTruth: string
}

interface GameState {
  phase: Phase
  p1: PlayerData
  p2: PlayerData
  timer: number
  surpriseTruth: string
}

const BLANK_PLAYER = (name: string): PlayerData => ({
  name,
  statements: ['', '', ''],
  lieIndex: 0,
  guessedLie: null,
  score: 0,
  extraTruth: '',
})

// ─── Componente principal ─────────────────────────────────────────────────────

export default function VerdadesGame() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tutorial = useGameTutorial('verdades', TUTORIAL_STEPS)
  const rm = useGameSession<GameState>('verdades')

  const { screen, session, myRole, gameState, loading, error } = rm

  // Timer local (não no Firestore — só visual)
  const [localTimer, setLocalTimer] = useState(30)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isP1 = myRole === 'p1'
  const p1Name = session?.p1Name ?? 'Jogador 1'
  const p2Name = session?.p2Name ?? 'Jogador 2'

  // Inicia timer quando fase muda para guessing
  useEffect(() => {
    if (!gameState) return
    if (gameState.phase === 'guessing_p1' || gameState.phase === 'guessing_p2') {
      setLocalTimer(30)
      setTimerRunning(true)
    } else {
      setTimerRunning(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [gameState?.phase])

  useEffect(() => {
    if (!timerRunning) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setLocalTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          setTimerRunning(false)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [timerRunning])

  // ── Handlers que gravam no Firestore ────────────────────────────────────────

  async function handleCreate(name: string) {
    const initial: GameState = {
      phase: 'writing_p1',
      p1: BLANK_PLAYER(name),
      p2: BLANK_PLAYER(''),
      timer: 30,
      surpriseTruth: '',
    }
    await rm.handleCreate(name, initial)
  }

  async function handleJoin(name: string, code: string) {
    await rm.handleJoin(name, code)
  }

  // P1 termina de escrever → muda para guessing_p2
  async function submitWriting(statements: [string, string, string], lieIndex: number) {
    if (!gameState) return
    if (gameState.phase === 'writing_p1') {
      const next: GameState = {
        ...gameState,
        p1: { ...gameState.p1, statements, lieIndex },
        phase: 'guessing_p2',
      }
      await rm.pushState(next)
    } else {
      // writing_p2
      const next: GameState = {
        ...gameState,
        p2: { ...gameState.p2, statements, lieIndex },
        phase: 'guessing_p1',
      }
      await rm.pushState(next)
    }
  }

  async function submitGuess(guessIdx: number) {
    if (!gameState) return
    if (gameState.phase === 'guessing_p2') {
      const correct = guessIdx === gameState.p1.lieIndex
      const next: GameState = {
        ...gameState,
        p2: { ...gameState.p2, guessedLie: guessIdx, score: gameState.p2.score + (correct ? 1 : 0) },
        phase: 'result_r1',
      }
      await rm.pushState(next)
    } else {
      // guessing_p1
      const correct = guessIdx === gameState.p2.lieIndex
      const next: GameState = {
        ...gameState,
        p1: { ...gameState.p1, guessedLie: guessIdx, score: gameState.p1.score + (correct ? 1 : 0) },
        phase: 'result_r2',
      }
      await rm.pushState(next)
    }
  }

  async function advanceAfterResult() {
    if (!gameState) return
    if (gameState.phase === 'result_r1') {
      // Próxima: P2 escreve
      const next: GameState = {
        ...gameState,
        p2: { ...gameState.p2, statements: ['', '', ''], lieIndex: 0, guessedLie: null },
        phase: 'writing_p2',
      }
      await rm.pushState(next)
    } else {
      // result_r2 → verificar fim
      const bothCorrect = gameState.p1.guessedLie === gameState.p2.lieIndex && gameState.p2.guessedLie === gameState.p1.lieIndex
      const bothWrong = gameState.p1.guessedLie !== gameState.p2.lieIndex && gameState.p2.guessedLie !== gameState.p1.lieIndex
      let nextPhase: Phase = 'end'
      if (bothWrong) nextPhase = 'extra'
      else if (bothCorrect) nextPhase = 'surprise'
      await rm.pushState({ ...gameState, phase: nextPhase })
    }
  }

  async function submitSurpriseTruth(surpriseTruth: string) {
    if (!gameState) return
    await rm.pushState({ ...gameState, surpriseTruth, phase: 'end' })
  }

  async function submitExtras(p1Extra: string, p2Extra: string) {
    if (!gameState) return
    await rm.pushState({
      ...gameState,
      p1: { ...gameState.p1, extraTruth: p1Extra },
      p2: { ...gameState.p2, extraTruth: p2Extra },
      phase: 'end',
    })
  }

  async function restart() {
    if (!gameState) return
    await rm.pushState({
      phase: 'writing_p1',
      p1: BLANK_PLAYER(p1Name),
      p2: BLANK_PLAYER(p2Name),
      timer: 30,
      surpriseTruth: '',
    })
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  // Tela de setup
  if (screen === 'setup') {
    const initialCode = searchParams.get('code') ?? undefined
    return (
      <>
        <GameTutorial open={tutorial.open} steps={tutorial.steps} stepIdx={tutorial.stepIdx}
          onClose={tutorial.close} onNext={tutorial.next} onPrev={tutorial.prev}
          accentColor="bg-violet-600" accentBorder="border-violet-200" accentBg="bg-violet-50" accentText="text-violet-800" />
        <div className="flex flex-col min-h-full">
          <TopBar title="2 Verdades, 1 Mentira" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial} />
          <div className="flex-1 overflow-y-auto">
            <SetupRoom
              title="2 Verdades, 1 Mentira"
              accentColor="bg-violet-100"
              icon={<HelpCircle size={28} className="text-violet-600" />}
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

  // Aguardando P2
  if (screen === 'waiting') {
    return (
      <div className="flex flex-col min-h-full">
        <TopBar title="2 Verdades, 1 Mentira" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial} />
        <div className="flex-1 overflow-y-auto">
          <WaitingRoom
            code={session!.code}
            gamePath="/ideas/games/verdades"
            onCancel={() => navigate('/ideas/games')}
          />
        </div>
      </div>
    )
  }

  if (!gameState) return null

  const gs = gameState

  function renderPlaying() {
    // ── P1 escreve ──────────────────────────────────────────────────────────
    if (gs.phase === 'writing_p1') {
      if (!isP1) {
        return (
          <WaitMsg name={p1Name} msg="está escrevendo as afirmações..." />
        )
      }
      return <WritingPanel name={p1Name} onSubmit={submitWriting} accentColor="text-violet-600" accentBg="bg-violet-50 border-violet-200" />
    }

    // ── P2 adivinhe ─────────────────────────────────────────────────────────
    if (gs.phase === 'guessing_p2') {
      if (isP1) return <WaitMsg name={p2Name} msg="está tentando adivinhar..." />
      return (
        <GuessingPanel
          guesserName={p2Name}
          writerName={p1Name}
          statements={gs.p1.statements}
          timer={localTimer}
          onGuess={submitGuess}
        />
      )
    }

    // ── Resultado rodada 1 ──────────────────────────────────────────────────
    if (gs.phase === 'result_r1') {
      const correct = gs.p2.guessedLie === gs.p1.lieIndex
      return (
        <ResultPanel
          guesserName={p2Name}
          correct={correct}
          writerStatements={gs.p1.statements}
          writerLieIndex={gs.p1.lieIndex}
          next={isP1 ? advanceAfterResult : undefined}
          nextLabel={`Vez de ${p2Name} escrever`}
          waitingFor={isP1 ? undefined : p1Name}
        />
      )
    }

    // ── P2 escreve ──────────────────────────────────────────────────────────
    if (gs.phase === 'writing_p2') {
      if (isP1) return <WaitMsg name={p2Name} msg="está escrevendo as afirmações..." />
      return <WritingPanel name={p2Name} onSubmit={submitWriting} accentColor="text-violet-600" accentBg="bg-violet-50 border-violet-200" />
    }

    // ── P1 adivinhe ─────────────────────────────────────────────────────────
    if (gs.phase === 'guessing_p1') {
      if (!isP1) return <WaitMsg name={p1Name} msg="está tentando adivinhar..." />
      return (
        <GuessingPanel
          guesserName={p1Name}
          writerName={p2Name}
          statements={gs.p2.statements}
          timer={localTimer}
          onGuess={submitGuess}
        />
      )
    }

    // ── Resultado rodada 2 ──────────────────────────────────────────────────
    if (gs.phase === 'result_r2') {
      const correct = gs.p1.guessedLie === gs.p2.lieIndex
      return (
        <ResultPanel
          guesserName={p1Name}
          correct={correct}
          writerStatements={gs.p2.statements}
          writerLieIndex={gs.p2.lieIndex}
          next={isP1 ? advanceAfterResult : undefined}
          nextLabel="Ver resultado final"
          waitingFor={isP1 ? undefined : p1Name}
        />
      )
    }

    // ── Surprise ────────────────────────────────────────────────────────────
    if (gs.phase === 'surprise') {
      return <SurprisePanel onSubmit={submitSurpriseTruth} isP1={isP1} />
    }

    // ── Extra ───────────────────────────────────────────────────────────────
    if (gs.phase === 'extra') {
      return (
        <ExtraPanel
          p1Name={p1Name}
          p2Name={p2Name}
          isP1={isP1}
          onSubmit={submitExtras}
        />
      )
    }

    // ── End ─────────────────────────────────────────────────────────────────
    const scores = [gs.p1.score, gs.p2.score]
    const winner = scores[0] > scores[1] ? p1Name : scores[1] > scores[0] ? p2Name : null
    return (
      <div className="max-w-sm mx-auto p-5 flex flex-col gap-4 items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center">
          <Trophy size={28} className="text-violet-600" />
        </div>
        <p className="text-xl font-bold text-stone-900">{winner ? `${winner} venceu!` : 'Empate!'}</p>
        {gs.surpriseTruth && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-left text-amber-800 w-full">
            <p className="text-[10px] font-bold uppercase text-amber-500 mb-1">Verdade que surpreendeu</p>
            {gs.surpriseTruth}
          </div>
        )}
        <div className="w-full card p-4 space-y-2">
          {[{ name: p1Name, score: gs.p1.score }, { name: p2Name, score: gs.p2.score }].map(pl => (
            <div key={pl.name} className="flex items-center justify-between">
              <span className="text-sm text-stone-700">{pl.name}</span>
              <span className="text-sm font-bold text-stone-900">{pl.score} pts</span>
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
        accentColor="bg-violet-600" accentBorder="border-violet-200" accentBg="bg-violet-50" accentText="text-violet-800" />
      <div className="flex flex-col min-h-full">
        <TopBar title="2 Verdades, 1 Mentira" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial} />
        <div className="flex-1 overflow-y-auto">{renderPlaying()}</div>
      </div>
    </>
  )
}

// ─── Sub-painéis ──────────────────────────────────────────────────────────────

function WaitMsg({ name, msg }: { name: string; msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 p-6 text-center">
      <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
      <p className="text-sm text-stone-500">Aguardando <strong className="text-stone-800">{name}</strong>… {msg}</p>
    </div>
  )
}

function WritingPanel({ name, onSubmit, accentColor, accentBg }: {
  name: string
  onSubmit: (statements: [string, string, string], lieIndex: number) => void
  accentColor: string
  accentBg: string
}) {
  const [statements, setStatements] = useState<[string, string, string]>(['', '', ''])
  const [lieIndex, setLieIndex] = useState(0)
  const ready = statements.every(s => s.trim())

  function update(i: number, val: string) {
    const s = [...statements] as [string, string, string]
    s[i] = val
    setStatements(s)
  }

  return (
    <div className="max-w-sm mx-auto p-5 flex flex-col gap-4">
      <div className={`card p-4 ${accentBg}`}>
        <p className={`text-xs font-semibold ${accentColor} uppercase tracking-wide mb-1`}>Vez de: {name}</p>
        <p className="text-sm text-stone-700">Escreva 3 afirmações sobre você. Escolha qual é a mentira.</p>
      </div>
      {([0, 1, 2] as const).map(i => (
        <div key={i} className="card p-3 space-y-2">
          <p className="text-xs font-semibold text-stone-400 uppercase">Afirmação {i + 1}</p>
          <textarea
            className="textarea"
            rows={2}
            placeholder={i === lieIndex ? 'Esta é a mentira...' : 'Uma verdade sua...'}
            value={statements[i]}
            onChange={e => update(i, e.target.value)}
          />
          <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-500">
            <input
              type="radio"
              name="lie"
              checked={lieIndex === i}
              onChange={() => setLieIndex(i)}
              className="accent-violet-600"
            />
            Esta é a mentira
          </label>
        </div>
      ))}
      <button
        onClick={() => onSubmit(statements, lieIndex)}
        disabled={!ready}
        className="btn-primary justify-center py-3 disabled:opacity-40"
      >
        Pronto — enviar
        <CheckCheck size={14} />
      </button>
    </div>
  )
}

function GuessingPanel({ guesserName, writerName, statements, timer, onGuess }: {
  guesserName: string
  writerName: string
  statements: [string, string, string]
  timer: number
  onGuess: (idx: number) => void
}) {
  return (
    <div className="max-w-sm mx-auto p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-700">{guesserName}, qual é a mentira de {writerName}?</p>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-bold ${timer <= 10 ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-700'}`}>
          <Clock size={13} />
          {timer}s
        </div>
      </div>
      {statements.map((s, i) => (
        <button
          key={i}
          onClick={() => onGuess(i)}
          className="card p-4 text-left hover:border-violet-300 hover:bg-violet-50 transition-all"
        >
          <span className="text-xs font-bold text-stone-400 mr-2">#{i + 1}</span>
          <span className="text-sm text-stone-800">{s}</span>
        </button>
      ))}
    </div>
  )
}

function ResultPanel({ guesserName, correct, writerStatements, writerLieIndex, next, nextLabel, waitingFor }: {
  guesserName: string
  correct: boolean
  writerStatements: [string, string, string]
  writerLieIndex: number
  next?: () => void
  nextLabel: string
  waitingFor?: string
}) {
  return (
    <div className="max-w-sm mx-auto p-5 flex flex-col gap-4 items-center text-center">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${correct ? 'bg-emerald-100' : 'bg-red-100'}`}>
        <span className="text-3xl">{correct ? '✓' : '✗'}</span>
      </div>
      <div>
        <p className={`text-lg font-bold ${correct ? 'text-emerald-700' : 'text-red-600'}`}>
          {correct ? `${guesserName} acertou!` : `${guesserName} errou.`}
        </p>
        <p className="text-sm text-stone-500 mt-1">
          A mentira era: <strong className="text-stone-800">"{writerStatements[writerLieIndex]}"</strong>
        </p>
      </div>
      <div className="w-full space-y-2">
        {writerStatements.map((s, i) => (
          <div
            key={i}
            className={`p-3 rounded-xl border text-sm text-left ${i === writerLieIndex ? 'bg-red-50 border-red-200 text-red-700 font-semibold' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
          >
            <span className="text-[10px] font-bold uppercase mr-1">{i === writerLieIndex ? 'MENTIRA' : 'VERDADE'}</span>
            {s}
          </div>
        ))}
      </div>
      {next ? (
        <button onClick={next} className="btn-primary w-full justify-center py-3">
          {nextLabel}
          <CheckCheck size={14} />
        </button>
      ) : waitingFor ? (
        <p className="text-xs text-stone-400">Aguardando <strong>{waitingFor}</strong> avançar...</p>
      ) : null}
    </div>
  )
}

function SurprisePanel({ onSubmit, isP1 }: { onSubmit: (text: string) => void; isP1: boolean }) {
  const [text, setText] = useState('')
  return (
    <div className="max-w-sm mx-auto p-5 flex flex-col gap-4">
      <div className="card p-4 bg-amber-50 border-amber-200 text-center">
        <p className="text-sm font-bold text-amber-700">Os dois acertaram!</p>
        <p className="text-sm text-stone-700 mt-2 font-semibold">Qual verdade do outro te surpreendeu mais?</p>
      </div>
      {isP1 ? (
        <>
          <textarea className="textarea" rows={3} placeholder="Escreva aqui..." value={text} onChange={e => setText(e.target.value)} />
          <button onClick={() => onSubmit(text)} disabled={!text.trim()} className="btn-primary justify-center py-3 disabled:opacity-40">
            Continuar
          </button>
        </>
      ) : (
        <WaitMsg name="Jogador 1" msg="está respondendo..." />
      )}
    </div>
  )
}

function ExtraPanel({ p1Name, p2Name, isP1, onSubmit }: {
  p1Name: string; p2Name: string; isP1: boolean; onSubmit: (p1: string, p2: string) => void
}) {
  const [p1Extra, setP1Extra] = useState('')
  const [p2Extra, setP2Extra] = useState('')

  return (
    <div className="max-w-sm mx-auto p-5 flex flex-col gap-4 text-center">
      <div className="card p-4 bg-stone-900 text-white">
        <p className="text-lg font-bold">EMPATE ABSURDO</p>
        <p className="text-sm text-stone-300 mt-2">Os dois erraram! Cada um precisa contar uma verdade extra.</p>
      </div>
      <div className="card p-3 space-y-2">
        <p className="text-xs font-semibold text-stone-500 uppercase">{p1Name} — verdade extra</p>
        <textarea className="textarea" rows={2} placeholder="Uma coisa verdadeira sobre você..."
          value={p1Extra} onChange={e => setP1Extra(e.target.value)} />
      </div>
      <div className="card p-3 space-y-2">
        <p className="text-xs font-semibold text-stone-500 uppercase">{p2Name} — verdade extra</p>
        <textarea className="textarea" rows={2} placeholder="Uma coisa verdadeira sobre você..."
          value={p2Extra} onChange={e => setP2Extra(e.target.value)} />
      </div>
      {isP1 && (
        <button
          onClick={() => onSubmit(p1Extra, p2Extra)}
          disabled={!p1Extra.trim() || !p2Extra.trim()}
          className="btn-primary justify-center py-3 disabled:opacity-40"
        >
          Ver resultado
        </button>
      )}
      {!isP1 && <p className="text-xs text-stone-400">Aguardando o host confirmar...</p>}
    </div>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar({ title, onBack, onHelp }: { title: string; onBack: () => void; onHelp: () => void }) {
  return (
    <div className="px-4 pt-5 pb-3 md:px-7 md:pt-6 border-b border-stone-100 shrink-0">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors shrink-0" aria-label="Voltar">
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
