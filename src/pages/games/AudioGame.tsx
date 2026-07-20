import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, RefreshCw, Trophy, Play, Square, CheckCircle, HelpCircle } from 'lucide-react'
import { useGameTutorial } from '../../hooks/useGameTutorial'
import GameTutorial from '../../components/GameTutorial'

// ─── Tutorial ─────────────────────────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    title: 'Bem-vindos ao Adivinhe o Áudio!',
    text: 'O app sorteia o que imitar. O jogador da vez grava até 10 segundos imitando aquela coisa. O outro ouve e tenta adivinhar o que era.',
  },
  {
    title: 'Gravando',
    text: 'Toque em "Gravar", faça sua melhor imitação e toque em "Parar". O áudio é salvo automaticamente após 10 segundos.',
  },
  {
    title: 'Adivinhando',
    text: 'O outro jogador ouve o áudio e digita o que acha que era a imitação. Se acertar as primeiras letras da resposta, ponto para ele!',
  },
  {
    title: 'Penalidade e bônus',
    text: 'Quem errar precisa contar uma história embaraçosa. Se os dois rirem muito do áudio, ganham o Selo da Gargalhada com uma pergunta bônus!',
  },
]

// ─── Dados ────────────────────────────────────────────────────────────────────

const IMITATIONS = [
  'Seu chefe quando manda uma mensagem urgente',
  'Um gato com muita fome',
  'Alguém tentando abrir um pote de vidro',
  'Um bebê aprendendo a falar',
  'Um carro que não quer ligar',
  'Um cachorro que viu o dono chegar',
  'Uma impressora travada',
  'Alguém comendo algo muito quente',
  'Uma campainha quebrada',
  'Um pato bravo',
  'Alguém preso no trânsito',
  'Uma galinha com fome',
  'Um robô com bateria fraca',
  'Alguém tentando cantar sem saber a letra',
  'Um avião passando baixo',
  'Uma moto tentando subir uma ladeira',
  'Alguém tentando arrotar discretamente',
  'Uma sereia hipnotizando alguém',
  'Um fantasma tímido',
  'Alguém acordando de manhã',
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

type Phase = 'setup' | 'round' | 'guessing' | 'result' | 'penalty' | 'end'

interface Player {
  name: string
  score: number
  penaltyStory: string
}

interface Round {
  imitation: string
  recorder: 0 | 1
  audioBlob: Blob | null
  audioUrl: string | null
  guess: string
  correct: boolean
}

const BLANK_PLAYER: Player = { name: '', score: 0, penaltyStory: '' }

// ─── Componente principal ────────────────────────────────────────────────────

export default function AudioGame() {
  const navigate = useNavigate()
  const tutorial = useGameTutorial('audio', TUTORIAL_STEPS)
  const [phase, setPhase]     = useState<Phase>('setup')
  const [p, setP]             = useState<[Player, Player]>([{ ...BLANK_PLAYER }, { ...BLANK_PLAYER }])
  const [imitList]            = useState(() => shuffle(IMITATIONS))
  const [imitIdx, setImitIdx] = useState(0)
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [roundNum, setRoundNum] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [recordSecs, setRecordSecs] = useState(0)
  const [laughBadge, setLaughBadge] = useState(false)
  const [laughQuestion, setLaughQuestion] = useState('')
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const recorder = roundNum % 2 as 0 | 1
  const guesser = (1 - recorder) as 0 | 1

  const imitation = imitList[imitIdx % imitList.length]

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setCurrentRound(r => r ? { ...r, audioBlob: blob, audioUrl: url } : r)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      mediaRef.current = mr
      setIsRecording(true)
      setRecordSecs(0)
      timerRef.current = setInterval(() => {
        setRecordSecs(s => {
          if (s >= 9) {
            stopRecording()
            return 10
          }
          return s + 1
        })
      }, 1000)
    } catch {
      alert('Permissão de microfone necessária para gravar áudio.')
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current!)
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop()
    setIsRecording(false)
  }

  function playAudio() {
    if (!currentRound?.audioUrl) return
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    const a = new Audio(currentRound.audioUrl)
    audioRef.current = a
    a.play()
  }

  function beginRound() {
    setCurrentRound({ imitation, recorder, audioBlob: null, audioUrl: null, guess: '', correct: false })
    setPhase('round')
  }

  function submitGuess() {
    if (!currentRound?.guess.trim()) return
    const correct = currentRound.guess.toLowerCase().includes(imitation.toLowerCase().slice(0, 5))
    const updated = { ...currentRound, correct }
    setCurrentRound(updated)
    if (correct) {
      setP(prev => {
        const u = [...prev] as [Player, Player]
        u[guesser] = { ...u[guesser], score: u[guesser].score + 1 }
        return u
      })
    }
    setPhase('result')
  }

  function nextRound() {
    setImitIdx(i => i + 1)
    setRoundNum(n => n + 1)
    setCurrentRound(null)
    setIsRecording(false)
    setRecordSecs(0)
    setLaughBadge(false)
    setLaughQuestion('')
    setPhase('round')
    const imitationNext = imitList[(imitIdx + 1) % imitList.length]
    setCurrentRound({ imitation: imitationNext, recorder: ((roundNum + 1) % 2) as 0 | 1, audioBlob: null, audioUrl: null, guess: '', correct: false })
  }

  function restart() {
    setPhase('setup')
    setRoundNum(0)
    setImitIdx(0)
    setP([{ ...BLANK_PLAYER }, { ...BLANK_PLAYER }])
    setCurrentRound(null)
    setLaughBadge(false)
    setLaughQuestion('')
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  function renderContent() {
    if (phase === 'setup') {
      return (
        <Shell title="Adivinhe o Áudio" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial}>
          <div className="max-w-sm mx-auto p-5 flex flex-col gap-5">
            <div className="card p-4 bg-rose-50 border-rose-200">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">Como funciona</p>
              <p className="text-sm text-stone-700 mt-1 leading-relaxed">
                O app sugere o que imitar. Grave 10 s de áudio. O outro adivinha. Quem acertar mais imitações vence.
              </p>
            </div>
            <div className="card p-3 bg-amber-50 border-amber-200 flex items-start gap-2">
              <span className="text-amber-500 text-base leading-none mt-0.5">👥</span>
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Somente presencial.</strong> Os dois precisam estar juntos para gravar e ouvir o áudio no mesmo aparelho.
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
            <button
              onClick={() => { if (p[0].name.trim() && p[1].name.trim()) { beginRound(); setPhase('round') } }}
              disabled={!p[0].name.trim() || !p[1].name.trim()}
              className="btn-primary justify-center py-3 disabled:opacity-40"
            >
              <Mic size={16} />
              Começar
            </button>
          </div>
        </Shell>
      )
    }

    if (phase === 'round' && currentRound) {
      return (
        <Shell title="Adivinhe o Áudio" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial}>
          <div className="max-w-sm mx-auto p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400 font-semibold uppercase">Rodada {roundNum + 1}</span>
              <div className="flex gap-2 text-xs">
                <span className="text-rose-600 font-bold">{p[0].name}: {p[0].score} pts</span>
                <span className="text-stone-400">·</span>
                <span className="text-rose-600 font-bold">{p[1].name}: {p[1].score} pts</span>
              </div>
            </div>

            <div className="card p-4 bg-rose-50 border-rose-200 text-center">
              <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide mb-1">
                {p[recorder].name}, imite:
              </p>
              <p className="text-xl font-bold text-stone-900">{currentRound.imitation}</p>
            </div>

            {!currentRound.audioUrl ? (
              <div className="card p-5 flex flex-col items-center gap-4">
                {isRecording ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center animate-pulse">
                      <Mic size={24} className="text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-600">{recordSecs}s</p>
                    <button onClick={stopRecording} className="btn-primary bg-red-500 hover:bg-red-600 justify-center px-6">
                      <Square size={14} />
                      Parar
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-rose-100 border-2 border-rose-200 flex items-center justify-center">
                      <Mic size={24} className="text-rose-500" />
                    </div>
                    <p className="text-sm text-stone-500">Grave até 10 segundos</p>
                    <button onClick={startRecording} className="btn-primary justify-center px-6">
                      <Mic size={14} />
                      Gravar
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="card p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold text-stone-400 uppercase">Áudio gravado!</p>
                <button onClick={playAudio} className="btn-secondary justify-center">
                  <Play size={14} />
                  Ouvir áudio
                </button>
                <button onClick={() => setPhase('guessing')} className="btn-primary justify-center py-3">
                  Passar para {p[guesser].name} adivinhar
                </button>
              </div>
            )}
          </div>
        </Shell>
      )
    }

    if (phase === 'guessing' && currentRound) {
      return (
        <Shell title="Adivinhe o Áudio" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial}>
          <div className="max-w-sm mx-auto p-5 flex flex-col gap-4">
            <div className="card p-4 bg-stone-50 text-center">
              <p className="text-xs font-semibold text-stone-400 uppercase mb-1">{p[guesser].name}, ouça e adivinhe!</p>
              <button onClick={playAudio} className="btn-primary justify-center mt-2 w-full">
                <Play size={14} />
                Ouvir áudio
              </button>
            </div>
            <div className="card p-4 space-y-2">
              <p className="text-xs font-semibold text-stone-400 uppercase">O que era a imitação?</p>
              <input
                className="input"
                placeholder="Sua resposta..."
                value={currentRound.guess}
                onChange={e => setCurrentRound(r => r ? { ...r, guess: e.target.value } : r)}
              />
            </div>
            <div className="card p-3 bg-amber-50 border-amber-200">
              <p className="text-xs text-stone-600">Os dois riram do áudio?</p>
              <button
                onClick={() => {
                  setLaughBadge(true)
                  setLaughQuestion('Qual foi a última vez que você riu até chorar?')
                }}
                className="text-xs text-amber-600 font-semibold mt-1 underline"
              >
                Sim, ganhamos o Selo da Gargalhada!
              </button>
            </div>
            {laughBadge && laughQuestion && (
              <div className="card p-3 bg-amber-50 border-amber-300">
                <p className="text-xs font-bold text-amber-600 uppercase mb-1">Pergunta Bônus</p>
                <p className="text-sm text-stone-700">{laughQuestion}</p>
              </div>
            )}
            <button onClick={submitGuess} disabled={!currentRound.guess.trim()} className="btn-primary justify-center py-3 disabled:opacity-40">
              <CheckCircle size={14} />
              Confirmar palpite
            </button>
          </div>
        </Shell>
      )
    }

    if (phase === 'result' && currentRound) {
      const loser = currentRound.correct ? recorder : guesser
      return (
        <Shell title="Adivinhe o Áudio" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial}>
          <div className="max-w-sm mx-auto p-5 flex flex-col gap-4 text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${currentRound.correct ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <span className="text-3xl">{currentRound.correct ? '✓' : '✗'}</span>
            </div>
            <div>
              <p className={`text-lg font-bold ${currentRound.correct ? 'text-emerald-700' : 'text-red-600'}`}>
                {currentRound.correct ? `${p[guesser].name} acertou!` : `${p[guesser].name} errou.`}
              </p>
              <p className="text-sm text-stone-500 mt-1">
                Era: <strong className="text-stone-800">"{currentRound.imitation}"</strong>
              </p>
            </div>
            {!currentRound.correct && (
              <div className="card p-4 bg-stone-900 text-white text-left">
                <p className="text-xs font-bold uppercase text-stone-400 mb-2">Penalidade para {p[loser].name}:</p>
                <p className="text-sm text-stone-200">Grave um áudio de 30 segundos contando uma história embaraçosa!</p>
                <textarea
                  className="mt-2 w-full bg-stone-800 text-white rounded-xl p-2 text-sm border border-stone-600 resize-none"
                  rows={2}
                  placeholder="Ou escreva aqui o resumo da história..."
                  value={p[loser].penaltyStory}
                  onChange={e => setP(prev => {
                    const u = [...prev] as [Player, Player]
                    u[loser] = { ...u[loser], penaltyStory: e.target.value }
                    return u
                  })}
                />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={nextRound} className="btn-secondary flex-1 justify-center">
                Próxima rodada
              </button>
              <button onClick={() => setPhase('end')} className="btn-primary flex-1 justify-center">
                Encerrar
              </button>
            </div>
          </div>
        </Shell>
      )
    }

    // END
    const winner = p[0].score > p[1].score ? p[0].name : p[1].score > p[0].score ? p[1].name : null
    return (
      <Shell title="Adivinhe o Áudio" onBack={() => navigate('/ideas/games')} onHelp={tutorial.openTutorial}>
        <div className="max-w-sm mx-auto p-5 flex flex-col gap-4 items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center">
            <Trophy size={28} className="text-rose-600" />
          </div>
          <p className="text-xl font-bold text-stone-900">{winner ? `${winner} venceu!` : 'Empate!'}</p>
          <div className="w-full card p-4 space-y-2">
            {p.map(pl => (
              <div key={pl.name} className="flex justify-between">
                <span className="text-sm text-stone-700">{pl.name}</span>
                <span className="text-sm font-bold">{pl.score} acertos</span>
              </div>
            ))}
          </div>
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
        accentColor="bg-rose-600"
        accentBorder="border-rose-200"
        accentBg="bg-rose-50"
        accentText="text-rose-800"
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
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
