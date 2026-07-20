import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Flame, ChevronRight, RefreshCw, Trophy, Star, Copy, CheckCheck, Share2, Ban, Crown, HelpCircle } from 'lucide-react'
import { useGameTutorial } from '../hooks/useGameTutorial'
import GameTutorial from '../components/GameTutorial'
import { useAuth } from '../contexts/AuthContext'
import {
  createBrasaSession,
  getBrasaSessionByCode,
  joinBrasaSession,
  updateBrasaSession,
  subscribeBrasaSession,
  deleteField,
  type BrasaSession,
} from '../lib/db'
import {
  buildAct, pickRandom,
  FINAL_CHALLENGES, BONUS_CARDS,
  shuffle,
} from '../lib/brasaData'
import type { BrasaCard, Act } from '../lib/brasaData'
import {
  ACT1, ACT2, ACT3,
  generateRoomCode,
} from '../lib/brasaData'

// ─── Mapa de todas as cartas por ID ──────────────────────────────────────────

const ALL_CARDS: Record<string, BrasaCard> = Object.fromEntries(
  [...ACT1, ...ACT2, ...ACT3, ...BONUS_CARDS].map(c => [c.id, c])
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACT_META: Record<number | string, { label: string; sub: string; border: string; bg: string; color: string }> = {
  1:     { label: 'Ato I',    sub: 'Superficie', border: 'border-sky-200',    bg: 'bg-sky-50',    color: 'text-sky-700'    },
  2:     { label: 'Ato II',   sub: 'Profundeza',  border: 'border-violet-200', bg: 'bg-violet-50', color: 'text-violet-700' },
  3:     { label: 'Ato III',  sub: 'Brasa',       border: 'border-rose-200',   bg: 'bg-rose-50',   color: 'text-rose-700'   },
  99:    { label: 'Bonus',    sub: 'Chama Livre',  border: 'border-amber-200',  bg: 'bg-amber-50',  color: 'text-amber-700'  },
}

const HEAT_BAR: Record<string, string> = {
  warm: 'bg-sky-400',
  hot:  'bg-orange-400',
  fire: 'bg-red-500',
}

function BrasaBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value))
  const color = pct >= 80 ? 'bg-red-500' : pct >= 55 ? 'bg-orange-400' : pct >= 30 ? 'bg-amber-400' : 'bg-sky-400'
  return (
    <div className="flex items-center gap-2 w-full">
      <Flame size={13} className={pct >= 55 ? 'text-orange-500' : 'text-sky-400'} />
      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-stone-700 w-9 text-right">{pct}/100</span>
    </div>
  )
}

// ─── Tela: Setup ──────────────────────────────────────────────────────────────

function SetupScreen({ onCreate, onJoin, loading, initialCode }: {
  onCreate: (name: string) => void
  onJoin: (name: string, code: string) => void
  loading: boolean
  initialCode?: string
}) {
  const [tab, setTab] = useState<'create' | 'join'>(initialCode ? 'join' : 'create')
  const [name, setName] = useState('')
  const [code, setCode] = useState(initialCode ?? '')

  return (
    <div className="max-w-md mx-auto p-5 md:p-7 flex flex-col gap-5">
      <div className="text-center pt-2">
        <div className="w-16 h-16 rounded-2xl bg-stone-900 flex items-center justify-center mx-auto mb-4">
          <Flame size={30} className="text-orange-400" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Brasa</h1>
        <p className="text-sm text-stone-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
          Cada um no proprio celular. Escolham quem é mais provavel e descubram o quanto voces se conhecem.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Ato I',   sub: 'Leve' },
          { label: 'Ato II',  sub: 'Pessoal'  },
          { label: 'Ato III', sub: 'Sem filtro'        },
        ].map(a => (
          <div key={a.label} className="card p-3">
            <p className="text-xs font-bold text-stone-900">{a.label}</p>
            <p className="text-[10px] text-stone-500">{a.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex rounded-xl overflow-hidden border border-stone-200">
        {(['create', 'join'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              tab === t ? 'bg-stone-900 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'
            }`}
          >
            {t === 'create' ? 'Criar partida' : 'Entrar com codigo'}
          </button>
        ))}
      </div>

      <div className="card p-4 space-y-3">
        <div>
          <label className="label">Seu nome</label>
          <input
            className="input"
            placeholder="Como quer ser chamado"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
          />
        </div>

        {tab === 'join' && (
          <div>
            <label className="label">Codigo da partida</label>
            <input
              className="input uppercase tracking-[0.3em] font-bold text-center text-lg"
              placeholder="XXXX"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
              maxLength={4}
            />
          </div>
        )}
      </div>

      <button
        onClick={() => {
          if (!name.trim()) return
          if (tab === 'create') onCreate(name.trim())
          else if (code.length === 4) onJoin(name.trim(), code)
        }}
        disabled={loading || !name.trim() || (tab === 'join' && code.length < 4)}
        className="btn-primary justify-center py-3.5 text-base rounded-xl disabled:opacity-40"
      >
        <Flame size={16} />
        {loading ? 'Aguarde...' : tab === 'create' ? 'Criar partida' : 'Entrar na partida'}
      </button>
    </div>
  )
}

// ─── Tela: Aguardando P2 ──────────────────────────────────────────────────────

function WaitingScreen({ code, onCancel }: { code: string; onCancel: () => void }) {
  const [copied, setCopied] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const link = `${window.location.origin}/ideas/brasa?code=${code}`

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function shareLink() {
    if (navigator.share) {
      navigator.share({ title: 'Brasa 🔥', text: 'Vem jogar Brasa comigo!', url: link })
    } else {
      copyLink()
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 max-w-sm mx-auto text-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      </div>
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Partida criada</p>
        <p className="text-sm text-stone-600 mt-2">Mande o link ou o código para ela entrar:</p>
        <p className="text-5xl font-bold tracking-[0.25em] text-stone-900 mt-3 font-mono">{code}</p>
        <p className="text-xs text-stone-400 mt-3">Aguardando ela entrar…</p>
      </div>

      {/* Botões de compartilhamento */}
      <div className="flex gap-2 w-full">
        <button
          onClick={shareLink}
          className="btn-primary flex-1 justify-center"
        >
          <Share2 size={14} />
          Enviar link
        </button>
        <button
          onClick={copyLink}
          className="btn-secondary flex-1 justify-center"
        >
          {copied ? <CheckCheck size={14} className="text-emerald-600" /> : <Copy size={14} />}
          {copied ? 'Copiado!' : 'Copiar link'}
        </button>
      </div>

      {/* Cancelar convite */}
      {!confirmCancel ? (
        <button
          onClick={() => setConfirmCancel(true)}
          className="text-xs text-stone-400 hover:text-red-500 transition-colors underline underline-offset-2 mt-1"
        >
          Cancelar convite
        </button>
      ) : (
        <div className="w-full card p-4 flex flex-col gap-3">
          <p className="text-sm text-stone-700 font-medium">Cancelar o convite?</p>
          <p className="text-xs text-stone-500">O link ficará inválido e a partida será encerrada.</p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
            >
              Sim, cancelar
            </button>
            <button
              onClick={() => setConfirmCancel(false)}
              className="flex-1 py-2 rounded-xl border border-stone-200 text-stone-600 text-sm font-semibold hover:bg-stone-50 transition-colors"
            >
              Não
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tela: Convite cancelado ──────────────────────────────────────────────────

function CancelledScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 max-w-sm mx-auto text-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
        <Ban size={28} className="text-red-400" />
      </div>
      <div>
        <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Partida cancelada</p>
        <p className="text-lg font-semibold text-stone-900 mt-2">Convite recusado ou cancelado</p>
        <p className="text-sm text-stone-500 mt-2 leading-relaxed">
          Esta partida foi encerrada antes de começar.
        </p>
      </div>
      <button
        onClick={onRestart}
        className="btn-primary justify-center"
      >
        <RefreshCw size={14} />
        Criar nova partida
      </button>
    </div>
  )
}

// ─── Tela: Carta ─────────────────────────────────────────────────────────────

function CardScreen({
  card, session, myRole, onSubmitAnswer, onAdvance, loading,
}: {
  card: BrasaCard
  session: BrasaSession
  myRole: 'p1' | 'p2'
  onSubmitAnswer: (value: string) => Promise<void>
  onAdvance: () => Promise<void>
  loading: boolean
}) {
  const meta = ACT_META[session.act] ?? ACT_META[1]
  const [text, setText] = useState('')
  const [vote, setVote] = useState<'p1' | 'p2' | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const myAnswer   = myRole === 'p1' ? session.p1Answer : session.p2Answer
  const theirName  = myRole === 'p1' ? (session.p2Name ?? 'Parceiro') : session.p1Name

  const bothAnswered = !!session.p1Answer && !!session.p2Answer
  const iAmP1 = myRole === 'p1'
  const effectivePts = session.doublePts ? card.pts * 2 : card.pts

  // Reset ao mudar de carta
  useEffect(() => {
    setText('')
    setVote(null)
    setSubmitted(false)
  }, [session.cardIndex, session.act])

  // Já respondi nesta carta?
  const alreadyAnswered = !!myAnswer

  async function handleSubmit() {
    const val = card.mechanic === 'vote' ? (vote ?? '') : text.trim()
    if (!val) return
    setSubmitted(true)
    await onSubmitAnswer(val)
  }

  // Quem avança a carta: o p1 (host) quando ambos responderam
  const canAdvance = iAmP1 && bothAnswered

  return (
    <div className="max-w-lg mx-auto p-4 md:p-7 flex flex-col gap-4">

      {/* Badge */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${meta.color} ${meta.bg} ${meta.border}`}>
          {meta.label} — {meta.sub}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${HEAT_BAR[card.heat]}`} />
          <span className="text-xs font-bold text-stone-600">+{effectivePts} pts</span>
          {session.doublePts && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">x2</span>
          )}
        </div>
      </div>

      {/* Carta */}
      <div className={`rounded-2xl border-2 p-6 flex flex-col gap-3 ${meta.border} ${meta.bg}`}>
        <p className="text-lg font-semibold text-stone-900 leading-snug">{card.text}</p>
        <p className="text-sm text-stone-500 italic leading-relaxed border-t border-stone-200 pt-3">{card.how}</p>
      </div>


      {/* VOTE: ambos votam, revelam juntos */}
      {card.mechanic === 'vote' && (
        <div className="card p-4 space-y-3">
          {!bothAnswered ? (
            alreadyAnswered ? (
              <>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Voto enviado</p>
                <div className="flex items-center gap-2 text-stone-400">
                  <div className="w-3 h-3 border-2 border-stone-300 border-t-stone-500 rounded-full animate-spin" />
                  <p className="text-sm">Aguardando {theirName}...</p>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Quem e mais provavel?</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['p1', 'p2'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setVote(v)}
                      className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                        vote === v ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      {v === 'p1' ? session.p1Name : (session.p2Name ?? 'Parceiro')}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!vote || submitted || loading}
                  className="btn-primary w-full justify-center disabled:opacity-40"
                >
                  Enviar voto
                </button>
              </>
            )
          ) : (
            <>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Votos revelados</p>
              <div className="grid grid-cols-2 gap-3">
                {(['p1', 'p2'] as const).map(role => {
                  const ans = role === 'p1' ? session.p1Answer : session.p2Answer
                  const voterName = role === 'p1' ? session.p1Name : (session.p2Name ?? 'Parceiro')
                  const votedName = ans?.value === 'p1' ? session.p1Name : (session.p2Name ?? 'Parceiro')
                  return (
                    <div key={role} className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center">
                      <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">{voterName}</p>
                      <p className="text-sm font-bold text-stone-900">{votedName}</p>
                    </div>
                  )
                })}
              </div>
              {session.p1Answer?.value === session.p2Answer?.value ? (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-1">
                  <p className="text-xs font-bold text-emerald-700">Acertaram juntos</p>
                  <p className="text-[11px] text-emerald-600">+5 de sintonia na brasa e +3 pts para cada um</p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-center space-y-1">
                  <p className="text-xs font-bold text-stone-700">Votos diferentes</p>
                  <p className="text-[11px] text-stone-500">+1 pt pela ousadia de se expor</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Avanca (so o P1, quando ambos responderam) */}
      {canAdvance && (
        <button
          onClick={onAdvance}
          disabled={loading}
          className="btn-primary w-full justify-center py-3 rounded-xl disabled:opacity-40"
        >
          Proxima carta
          <ChevronRight size={15} />
        </button>
      )}
      {!iAmP1 && bothAnswered && (
        <p className="text-center text-xs text-stone-400">Aguardando {session.p1Name} avancar...</p>
      )}
    </div>
  )
}

// ─── Tela: Bonus unlock ───────────────────────────────────────────────────────

function BonusScreen({ session, myRole, onContinue, loading }: {
  session: BrasaSession; myRole: 'p1' | 'p2'; onContinue: () => void; loading: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 max-w-sm mx-auto text-center gap-5">
      <div className="w-20 h-20 rounded-3xl bg-stone-900 flex items-center justify-center">
        <Flame size={36} className="text-orange-400" />
      </div>
      <div>
        <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">Brasa atingiu 80</p>
        <h2 className="text-xl font-bold text-stone-900 mt-2">Rodada Bonus Desbloqueada</h2>
        <p className="text-sm text-stone-500 mt-3 leading-relaxed">
          Sem filtros. As cartas mais honestas do jogo.
        </p>
      </div>
      {myRole === 'p1' ? (
        <button onClick={onContinue} disabled={loading} className="btn-primary justify-center w-full py-3 bg-stone-900 disabled:opacity-40">
          Entrar na Chama Livre
          <Flame size={15} />
        </button>
      ) : (
        <div className="flex items-center gap-2 text-stone-400">
          <div className="w-4 h-4 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
          <p className="text-sm">Aguardando {session.p1Name} continuar...</p>
        </div>
      )}
    </div>
  )
}

// ─── Tela: Desafio final ──────────────────────────────────────────────────────

function FinalScreen({ session, myRole, onEnd, loading }: {
  session: BrasaSession; myRole: 'p1' | 'p2'; onEnd: () => void; loading: boolean
}) {
  const fc = FINAL_CHALLENGES.find(f => f.id === session.finalChallengeId) ?? FINAL_CHALLENGES[0]
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 max-w-sm mx-auto text-center gap-5">
      <div className="w-20 h-20 rounded-3xl bg-stone-900 flex items-center justify-center">
        <Star size={34} className="text-amber-400" />
      </div>
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Desafio Final</p>
        <p className="text-lg font-bold text-stone-900 mt-2 leading-snug">{fc.text}</p>
      </div>
      {myRole === 'p1' ? (
        <button onClick={onEnd} disabled={loading} className="btn-primary justify-center w-full py-3 bg-stone-900 disabled:opacity-40">
          Concluir partida
        </button>
      ) : (
        <p className="text-xs text-stone-400">Aguardando {session.p1Name} encerrar...</p>
      )}
    </div>
  )
}

// ─── Tela: Fim ────────────────────────────────────────────────────────────────

function EndScreen({ session, onRestart }: { session: BrasaSession; onRestart: () => void }) {
  const msg =
    session.brasa >= 95 ? 'Brasa total. Isso nao foi jogo — foi conexao de verdade.' :
    session.brasa >= 75 ? 'Partida intensa. Voces se conhecem melhor agora.' :
    session.brasa >= 50 ? 'Boa chama. Cada carta jogada valeu.' :
    'Começo de algo. Joguem de novo e vao mais fundo.'

  return (
    <div className="flex flex-col items-center p-6 max-w-sm mx-auto text-center gap-5 pb-12">
      <div className="w-20 h-20 rounded-3xl bg-stone-900 flex items-center justify-center mt-4">
        <Flame size={38} className="text-orange-400" />
      </div>
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Partida encerrada</p>
        <h2 className="text-3xl font-bold text-stone-900 mt-1">{session.brasa}<span className="text-stone-400 text-xl">/100</span></h2>
        <p className="text-sm text-stone-500 mt-2 leading-relaxed">{msg}</p>
      </div>

      <div className="w-full card p-4 space-y-3 text-left">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Placar final</p>
        {[
          { name: session.p1Name, pts: session.p1Pts },
          { name: session.p2Name ?? 'Parceiro', pts: session.p2Pts },
        ].map(p => (
          <div key={p.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-700">
                {p.name[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-stone-900">{p.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="text-sm font-bold text-stone-800">{p.pts} pts</span>
              {p.pts === Math.max(session.p1Pts, session.p2Pts) && session.p1Pts !== session.p2Pts && (
                <Crown size={12} className="text-stone-700" />
              )}
            </div>
          </div>
        ))}
        <div className="pt-2 border-t border-stone-100 flex justify-between">
          <span className="text-xs text-stone-400">Cartas jogadas</span>
          <span className="text-xs font-bold text-stone-700">{session.completedCards}</span>
        </div>
      </div>

      <button onClick={onRestart} className="btn-primary w-full justify-center py-3">
        <RefreshCw size={15} />
        Nova partida
      </button>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

type LocalScreen = 'setup' | 'waiting' | 'playing' | 'bonus_unlock' | 'final' | 'end' | 'cancelled'

const BRASA_TUTORIAL_STEPS = [
  {
    title: 'Bem-vindos ao Brasa!',
    text: 'Brasa é um jogo de conexão a dois. Cada rodada, uma carta aparece com uma pergunta ou atividade. Os dois respondem e revelam as respostas ao mesmo tempo.',
  },
  {
    title: 'Como jogar',
    text: 'Um jogador cria a sala e compartilha o código. O outro entra com o código. Cada um usa seu próprio celular — as respostas são individuais e simultâneas.',
  },
  {
    title: 'A barra de Brasa',
    text: 'A cada carta respondida, a barra de Brasa sobe. Quando atingir 80, a Rodada Bônus é desbloqueada. Em 100, o Desafio Final aparece!',
  },
  {
    title: 'Atos',
    text: 'O jogo tem 3 atos de profundidade crescente: Ato I (Superfície), Ato II (Profundeza) e Ato III (Brasa). O tema das perguntas vai ficando mais íntimo.',
  },
]

export default function BrasaPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const tutorial = useGameTutorial('brasa', BRASA_TUTORIAL_STEPS)
  const [screen, setScreen] = useState<LocalScreen>('setup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState<BrasaSession | null>(null)
  const [myRole, setMyRole] = useState<'p1' | 'p2'>('p1')
  const unsubRef = useRef<(() => void) | null>(null)

  // Assina o Firestore quando temos uma sessão
  useEffect(() => {
    if (!session?.id) return
    unsubRef.current?.()
    unsubRef.current = subscribeBrasaSession(session.id, updated => {
      setSession(updated)
    })
    return () => { unsubRef.current?.() }
  }, [session?.id])

  // Detecta transições de tela com base no estado do Firestore
  useEffect(() => {
    if (!session) return
    if (session.status === 'cancelled') { setScreen('cancelled'); return }
    if (session.status === 'done')      { setScreen('end');       return }
    if (session.finalChallengeId)       { setScreen('final');     return }
    if (session.bonusUnlocked && !session.finalChallengeId && session.act === 99) {
      setScreen('playing'); return
    }
    if (session.brasa >= 80 && !session.bonusUnlocked) {
      setScreen('bonus_unlock'); return
    }
    if (session.status === 'playing') { setScreen('playing'); return }
    if (session.status === 'waiting') { setScreen('waiting'); return }
  }, [session])

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleCreate(name: string) {
    if (!user) return
    setLoading(true); setError('')
    try {
      const code = generateRoomCode()
      const deck = buildAct(1, 5)
      const sessionId = await createBrasaSession(user.uid, name, code, deck.map(c => c.id))
      setMyRole('p1')
      setSession({ id: sessionId, code, p1Uid: user.uid, p1Name: name,
        status: 'waiting', deckIds: deck.map(c => c.id), cardIndex: 0,
        act: 1, brasa: 0, p1Pts: 0, p2Pts: 0, completedCards: 0,
        bonusUnlocked: false, doublePts: false,
        createdAt: Date.now(), updatedAt: Date.now(),
      })
      setScreen('waiting')
    } catch {
      setError('Erro ao criar partida. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(name: string, code: string) {
    if (!user) return
    setLoading(true); setError('')
    try {
      const found = await getBrasaSessionByCode(code)
      if (!found) { setError('Codigo nao encontrado ou partida ja iniciada.'); setLoading(false); return }
      await joinBrasaSession(found.id, user.uid, name)
      setMyRole('p2')
      setSession({ ...found, p2Uid: user.uid, p2Name: name, status: 'playing' })
    } catch {
      setError('Erro ao entrar na partida.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitAnswer(value: string) {
    if (!session) return
    setLoading(true)
    try {
      const answer = { playerId: myRole, value, submittedAt: Date.now() }
      await updateBrasaSession(session.id, {
        [myRole === 'p1' ? 'p1Answer' : 'p2Answer']: answer,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleAdvance() {
    if (!session || myRole !== 'p1') return
    setLoading(true)
    try {
      const card = ALL_CARDS[session.deckIds[session.cardIndex]]
      const pts = session.doublePts ? card.pts * 2 : card.pts
      const voteBonus = card.mechanic === 'vote' && session.p1Answer?.value === session.p2Answer?.value ? 5 : 0
      const sameVote = session.p1Answer?.value === session.p2Answer?.value
      const newBrasa  = Math.min(100, session.brasa + pts + voteBonus)
      const basePts = Math.max(1, Math.round(pts * 0.35))
      const agreePts = sameVote ? 3 : 0
      const newP1Pts  = session.p1Pts + basePts + agreePts
      const newP2Pts  = session.p2Pts + basePts + agreePts
      const newCompleted = session.completedCards + 1

      const nextIndex = session.cardIndex + 1
      const deckDone  = nextIndex >= session.deckIds.length

      // Brasa >= 100 → desafio final
      if (newBrasa >= 100 && !session.finalChallengeId) {
        const fc = pickRandom(FINAL_CHALLENGES)
        await updateBrasaSession(session.id, {
          brasa: newBrasa, p1Pts: newP1Pts, p2Pts: newP2Pts,
          completedCards: newCompleted, finalChallengeId: fc.id,
          p1Answer: deleteField() as any, p2Answer: deleteField() as any, doublePts: false,
        })
        return
      }

      // Fim do deck — avança o ato
      if (deckDone) {
        const nextAct: number =
          session.act === 1 ? 2 :
          session.act === 2 ? 3 :
          session.act === 3 ? 99 : 99

        const nextDeck = nextAct === 99
          ? shuffle(BONUS_CARDS).slice(0, 4)
          : buildAct(nextAct as Act, 5)

        await updateBrasaSession(session.id, {
          brasa: newBrasa, p1Pts: newP1Pts, p2Pts: newP2Pts,
          completedCards: newCompleted, act: nextAct,
          deckIds: nextDeck.map(c => c.id), cardIndex: 0,
          p1Answer: deleteField() as any, p2Answer: deleteField() as any, doublePts: false,
        })
        return
      }

      await updateBrasaSession(session.id, {
        brasa: newBrasa, p1Pts: newP1Pts, p2Pts: newP2Pts,
        completedCards: newCompleted, cardIndex: nextIndex,
        p1Answer: deleteField() as any, p2Answer: deleteField() as any, doublePts: false,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleBonusContinue() {
    if (!session || myRole !== 'p1') return
    setLoading(true)
    try {
      const deck = shuffle(BONUS_CARDS).slice(0, 4)
      await updateBrasaSession(session.id, {
        bonusUnlocked: true, act: 99,
        deckIds: deck.map(c => c.id), cardIndex: 0,
        p1Answer: deleteField() as any, p2Answer: deleteField() as any,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleFinalEnd() {
    if (!session || myRole !== 'p1') return
    setLoading(true)
    try {
      await updateBrasaSession(session.id, { status: 'done' })
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelInvite() {
    if (!session) return
    setLoading(true)
    try {
      await updateBrasaSession(session.id, { status: 'cancelled' })
    } finally {
      setLoading(false)
    }
  }

  function handleRestart() {
    unsubRef.current?.()
    setSession(null)
    setScreen('setup')
    setError('')
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const currentCard = session
    ? ALL_CARDS[session.deckIds[session.cardIndex]]
    : null

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
        accentBorder="border-orange-200"
        accentBg="bg-orange-50"
        accentText="text-orange-900"
      />
    <div className="flex flex-col min-h-full">

      {/* Topbar */}
      <div className="px-4 pt-5 pb-3 md:px-7 md:pt-6 border-b border-stone-100 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/ideas')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-stone-900 flex items-center gap-2">
              <Flame size={15} className="text-orange-500 shrink-0" />
              Brasa
            </h1>
            <p className="text-xs text-stone-400 mt-0.5">Jogo de conexao a dois</p>
          </div>
          {session && screen !== 'setup' && screen !== 'end' && (
            <div className="w-32 shrink-0">
              <BrasaBar value={session.brasa} />
            </div>
          )}
          {session && screen === 'playing' && (
            <div className="flex items-center gap-1 ml-1 shrink-0">
              <Trophy size={12} className="text-amber-400" />
              <span className="text-xs font-bold text-stone-700">{session.p1Pts + session.p2Pts}</span>
            </div>
          )}
          <button
            onClick={tutorial.openTutorial}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors shrink-0 text-stone-400 hover:text-stone-700"
            aria-label="Ver tutorial"
          >
            <HelpCircle size={18} />
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-2 pl-11">{error}</p>}
      </div>

      {/* Conteudo */}
      <div className="flex-1 overflow-y-auto">
        {screen === 'setup' && (
          <SetupScreen
            onCreate={handleCreate}
            onJoin={handleJoin}
            loading={loading}
            initialCode={searchParams.get('code')?.toUpperCase().slice(0, 4) ?? undefined}
          />
        )}

        {screen === 'waiting' && session && (
          <WaitingScreen code={session.code} onCancel={handleCancelInvite} />
        )}

        {screen === 'cancelled' && (
          <CancelledScreen onRestart={handleRestart} />
        )}

        {screen === 'playing' && session && currentCard && (
          <CardScreen
            card={currentCard}
            session={session}
            myRole={myRole}
            onSubmitAnswer={handleSubmitAnswer}
            onAdvance={handleAdvance}
            loading={loading}
          />
        )}

        {screen === 'bonus_unlock' && session && (
          <BonusScreen
            session={session}
            myRole={myRole}
            onContinue={handleBonusContinue}
            loading={loading}
          />
        )}

        {screen === 'final' && session && (
          <FinalScreen
            session={session}
            myRole={myRole}
            onEnd={handleFinalEnd}
            loading={loading}
          />
        )}

        {screen === 'end' && session && (
          <EndScreen session={session} onRestart={handleRestart} />
        )}
      </div>
    </div>
    </>
  )
}
