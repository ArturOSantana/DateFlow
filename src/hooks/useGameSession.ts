import { useState, useEffect, useRef } from 'react'
import {
  createGameSession,
  getGameSessionByCode,
  joinGameSession,
  updateGameSession,
  subscribeGameSession,
  type GameSession,
} from '../lib/db'

export type RoomScreen = 'setup' | 'waiting' | 'playing' | 'done'

/** Gera código de sala aleatório de 4 letras */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export interface UseGameSessionReturn<S> {
  screen: RoomScreen
  session: GameSession | null
  myRole: 'p1' | 'p2'
  gameState: S | null
  loading: boolean
  error: string
  /** Cria a sala como P1 */
  handleCreate: (name: string, initialState: S) => Promise<void>
  /** Entra na sala como P2 */
  handleJoin: (name: string, code: string) => Promise<void>
  /** Persiste novo estado no Firestore */
  pushState: (newState: S) => Promise<void>
  /** Marca a sessão como done */
  finishSession: () => Promise<void>
}

export function useGameSession<S extends object>(game: string): UseGameSessionReturn<S> {
  const [screen, setScreen] = useState<RoomScreen>('setup')
  const [session, setSession] = useState<GameSession | null>(null)
  const [myRole, setMyRole] = useState<'p1' | 'p2'>('p1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const unsubRef = useRef<(() => void) | null>(null)

  // Assina o Firestore ao obter uma sessão
  useEffect(() => {
    if (!session?.id) return
    unsubRef.current?.()
    unsubRef.current = subscribeGameSession(session.id, updated => {
      setSession(updated)
      if (updated.status === 'playing' && screen === 'waiting') setScreen('playing')
      if (updated.status === 'done') setScreen('done')
    })
    return () => { unsubRef.current?.() }
  }, [session?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const gameState: S | null = session?.state ? (JSON.parse(session.state) as S) : null

  async function handleCreate(name: string, initialState: S) {
    setLoading(true); setError('')
    try {
      const code = generateCode()
      const sessionId = await createGameSession(game, name, code, initialState)
      setMyRole('p1')
      setSession({
        id: sessionId, game, code, p1Name: name,
        status: 'waiting', state: JSON.stringify(initialState),
        updatedAt: Date.now(), createdAt: Date.now(),
      })
      setScreen('waiting')
    } catch {
      setError('Erro ao criar partida. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(name: string, code: string) {
    setLoading(true); setError('')
    try {
      const found = await getGameSessionByCode(game, code)
      if (!found) { setError('Código não encontrado ou partida já iniciada.'); setLoading(false); return }
      await joinGameSession(found.id, name)
      setMyRole('p2')
      setSession({ ...found, p2Name: name, status: 'playing' })
      setScreen('playing')
    } catch {
      setError('Erro ao entrar na partida.')
    } finally {
      setLoading(false)
    }
  }

  async function pushState(newState: S) {
    if (!session) return
    await updateGameSession(session.id, { state: JSON.stringify(newState) })
  }

  async function finishSession() {
    if (!session) return
    await updateGameSession(session.id, { status: 'done' })
  }

  return { screen, session, myRole, gameState, loading, error, handleCreate, handleJoin, pushState, finishSession }
}
