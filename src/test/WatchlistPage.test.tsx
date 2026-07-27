/**
 * Testes de componente para WatchlistPage.
 * Testa renderização, empty state, lista de itens, banner de erro e filtros.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// ─── Mocks inline ─────────────────────────────────────────────────────────────

vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: { currentUser: null },
  firebaseConfig: {},
  googleProvider: {},
  getMessagingInstance: vi.fn(),
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}))

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual<typeof import('firebase/auth')>('firebase/auth')
  return {
    ...actual,
    getAuth: vi.fn(),
    onAuthStateChanged: vi.fn((_a: unknown, cb: (u: null) => void) => { cb(null); return vi.fn() }),
    signOut: vi.fn(),
    GoogleAuthProvider: vi.fn(),
    indexedDBLocalPersistence: {},
    initializeAuth: vi.fn(),
  }
})

vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  isSupported: vi.fn(() => Promise.resolve(false)),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDoc: vi.fn(),
}))

vi.mock('@/lib/mobileAuth', () => ({
  signInWithGoogle: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'user1', displayName: 'Alice', email: 'alice@test.com' },
    loading: false,
    authError: null,
    signInWithGoogle: vi.fn(),
    logout: vi.fn(),
  })),
}))

vi.mock('@/lib/db', () => ({
  getMyPartnerships: vi.fn(() => Promise.resolve([])),
  getWatchlist: vi.fn(() => Promise.resolve([])),
  addWatchlistItem: vi.fn(() => Promise.resolve('new-id')),
  updateWatchlistItem: vi.fn(() => Promise.resolve()),
  deleteWatchlistItem: vi.fn(() => Promise.resolve()),
  setWatchlistReview: vi.fn(() => Promise.resolve()),
}))

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: { results: [] } }))),
}))

// ─── Imports tardios (após vi.mock) ──────────────────────────────────────────

import WatchlistPage from '@/pages/WatchlistPage'
import * as dbApi from '@/lib/db'
import * as AuthContext from '@/contexts/AuthContext'
import type { WatchlistItem } from '@/types'

// ─── Helper de render ─────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <WatchlistPage />
    </MemoryRouter>
  )
}

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: 'item1',
    addedByUserId: 'user1',
    addedByName: 'Alice',
    coupleIds: ['user1'],
    tmdbId: 1,
    title: 'Meu Filme',
    originalTitle: 'My Movie',
    mediaType: 'movie',
    posterPath: null,
    backdropPath: null,
    overview: 'Overview',
    releaseYear: '2024',
    tmdbRating: 8.5,
    genres: ['Ação'],
    status: 'to_watch',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('WatchlistPage — renderização básica', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(dbApi.getMyPartnerships).mockResolvedValue([])
    vi.mocked(dbApi.getWatchlist).mockResolvedValue([])
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { uid: 'user1', displayName: 'Alice', email: 'alice@test.com' } as never,
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('renderiza o título "Filmes & Séries"', async () => {
    renderPage()
    expect(await screen.findByText('Filmes & Séries')).toBeInTheDocument()
  })

  it('exibe o botão Adicionar', async () => {
    renderPage()
    const btn = await screen.findByRole('button', { name: /adicionar|add/i })
    expect(btn).toBeInTheDocument()
  })

  it('exibe o botão Sortear', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: /sortear/i })).toBeInTheDocument()
  })
})

describe('WatchlistPage — empty state', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(dbApi.getMyPartnerships).mockResolvedValue([])
    vi.mocked(dbApi.getWatchlist).mockResolvedValue([])
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { uid: 'user1', displayName: 'Alice', email: 'alice@test.com' } as never,
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('exibe "Lista vazia" quando não há itens', async () => {
    renderPage()
    expect(await screen.findByText('Lista vazia')).toBeInTheDocument()
  })

  it('exibe "0 pra assistir · 0 assistidos" nos contadores', async () => {
    renderPage()
    expect(await screen.findByText('0 pra assistir · 0 assistidos')).toBeInTheDocument()
  })

  it('botão Sortear fica desabilitado quando lista está vazia', async () => {
    renderPage()
    const sortBtn = await screen.findByRole('button', { name: /sortear/i })
    expect(sortBtn).toBeDisabled()
  })
})

describe('WatchlistPage — lista com itens', () => {
  const movieItem = makeItem({ id: '1', title: 'Inception',    mediaType: 'movie', status: 'to_watch' })
  const tvItem    = makeItem({ id: '2', title: 'Breaking Bad', mediaType: 'tv',    status: 'to_watch' })
  const doneItem  = makeItem({ id: '3', title: 'Parasite',     mediaType: 'movie', status: 'watched'  })

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(dbApi.getMyPartnerships).mockResolvedValue([])
    vi.mocked(dbApi.getWatchlist).mockResolvedValue([movieItem, tvItem, doneItem])
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { uid: 'user1', displayName: 'Alice', email: 'alice@test.com' } as never,
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('exibe o título dos itens na lista', async () => {
    renderPage()
    expect(await screen.findByText('Inception')).toBeInTheDocument()
    expect(await screen.findByText('Breaking Bad')).toBeInTheDocument()
    expect(await screen.findByText('Parasite')).toBeInTheDocument()
  })

  it('exibe contador correto "2 pra assistir · 1 assistidos"', async () => {
    renderPage()
    expect(await screen.findByText('2 pra assistir · 1 assistidos')).toBeInTheDocument()
  })

  it('botão Sortear fica habilitado quando há itens to_watch', async () => {
    renderPage()
    const sortBtn = await screen.findByRole('button', { name: /sortear/i })
    expect(sortBtn).not.toBeDisabled()
  })

  it('NÃO exibe "Lista vazia" quando há itens', async () => {
    renderPage()
    await screen.findByText('Inception')
    expect(screen.queryByText('Lista vazia')).not.toBeInTheDocument()
  })
})

describe('WatchlistPage — banner de erro', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(dbApi.getMyPartnerships).mockResolvedValue([])
    vi.mocked(dbApi.getWatchlist).mockRejectedValue(new Error('Firestore offline'))
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { uid: 'user1', displayName: 'Alice', email: 'alice@test.com' } as never,
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('exibe banner de erro quando getWatchlist falha', async () => {
    renderPage()
    expect(await screen.findByText(/Erro ao carregar lista/i)).toBeInTheDocument()
  })

  it('banner contém a mensagem de erro original', async () => {
    renderPage()
    expect(await screen.findByText(/Firestore offline/i)).toBeInTheDocument()
  })

  it('botão ✕ fecha o banner de erro', async () => {
    const user = userEvent.setup()
    renderPage()
    const closeBtn = await screen.findByRole('button', { name: '✕' })
    await user.click(closeBtn)
    await waitFor(() => {
      expect(screen.queryByText(/Erro ao carregar lista/i)).not.toBeInTheDocument()
    })
  })
})

describe('WatchlistPage — filtros de status', () => {
  const movieItem = makeItem({ id: '1', title: 'Inception', mediaType: 'movie', status: 'to_watch' })
  const doneItem  = makeItem({ id: '2', title: 'Parasite',  mediaType: 'movie', status: 'watched'  })

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(dbApi.getMyPartnerships).mockResolvedValue([])
    vi.mocked(dbApi.getWatchlist).mockResolvedValue([movieItem, doneItem])
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { uid: 'user1', displayName: 'Alice', email: 'alice@test.com' } as never,
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('clicar em "Pra assistir" oculta os itens watched', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Inception')

    // Abre painel de filtros (mobile toggle)
    const filterToggle = screen.queryByRole('button', { name: /filtros/i })
    if (filterToggle) await user.click(filterToggle)

    const toWatchBtn = await screen.findByRole('button', { name: /pra assistir/i })
    await user.click(toWatchBtn)

    expect(screen.getByText('Inception')).toBeInTheDocument()
    expect(screen.queryByText('Parasite')).not.toBeInTheDocument()
  })

  it('clicar em "Assistidos" oculta os itens to_watch', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Inception')

    const filterToggle = screen.queryByRole('button', { name: /filtros/i })
    if (filterToggle) await user.click(filterToggle)

    const watchedBtn = await screen.findByRole('button', { name: /assistidos/i })
    await user.click(watchedBtn)

    expect(screen.queryByText('Inception')).not.toBeInTheDocument()
    expect(screen.getByText('Parasite')).toBeInTheDocument()
  })

  it('clicar em "Todos" exibe ambos após filtrar', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Inception')

    const filterToggle = screen.queryByRole('button', { name: /filtros/i })
    if (filterToggle) await user.click(filterToggle)

    const toWatchBtn = await screen.findByRole('button', { name: /pra assistir/i })
    await user.click(toWatchBtn)

    const allBtn = await screen.findByRole('button', { name: /^todos$/i })
    await user.click(allBtn)

    expect(screen.getByText('Inception')).toBeInTheDocument()
    expect(screen.getByText('Parasite')).toBeInTheDocument()
  })
})

describe('WatchlistPage — filtros de mídia', () => {
  const movieItem = makeItem({ id: '1', title: 'Inception', mediaType: 'movie', status: 'to_watch' })
  const tvItem    = makeItem({ id: '2', title: 'Dark',      mediaType: 'tv',    status: 'to_watch' })

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(dbApi.getMyPartnerships).mockResolvedValue([])
    vi.mocked(dbApi.getWatchlist).mockResolvedValue([movieItem, tvItem])
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { uid: 'user1', displayName: 'Alice', email: 'alice@test.com' } as never,
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('clicar em "Filmes" oculta séries', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Inception')

    const filterToggle = screen.queryByRole('button', { name: /filtros/i })
    if (filterToggle) await user.click(filterToggle)

    const filmsBtn = await screen.findByRole('button', { name: /^filmes$/i })
    await user.click(filmsBtn)

    expect(screen.getByText('Inception')).toBeInTheDocument()
    expect(screen.queryByText('Dark')).not.toBeInTheDocument()
  })

  it('clicar em "Séries" oculta filmes', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Inception')

    const filterToggle = screen.queryByRole('button', { name: /filtros/i })
    if (filterToggle) await user.click(filterToggle)

    const tvBtn = await screen.findByRole('button', { name: /^séries$/i })
    await user.click(tvBtn)

    expect(screen.queryByText('Inception')).not.toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
  })
})

describe('WatchlistPage — modal de busca', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(dbApi.getMyPartnerships).mockResolvedValue([])
    vi.mocked(dbApi.getWatchlist).mockResolvedValue([])
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { uid: 'user1', displayName: 'Alice', email: 'alice@test.com' } as never,
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('abre modal de busca ao clicar em Adicionar', async () => {
    const user = userEvent.setup()
    renderPage()

    const addBtn = await screen.findByRole('button', { name: /adicionar|add/i })
    await user.click(addBtn)

    expect(await screen.findByText('Buscar filme ou série')).toBeInTheDocument()
    expect(await screen.findByPlaceholderText(/buscar filme ou série/i)).toBeInTheDocument()
  })

  it('exibe "Digite o nome para buscar" quando query está vazia', async () => {
    const user = userEvent.setup()
    renderPage()

    const addBtn = await screen.findByRole('button', { name: /adicionar|add/i })
    await user.click(addBtn)

    expect(await screen.findByText(/Digite o nome para buscar/i)).toBeInTheDocument()
  })

  it('exibe "Nenhum resultado." quando busca retorna vazio', async () => {
    const { httpsCallable } = await import('firebase/functions')
    vi.mocked(httpsCallable).mockReturnValue(
      vi.fn(() => Promise.resolve({ data: { results: [] } })) as never
    )

    const user = userEvent.setup()
    renderPage()

    const addBtn = await screen.findByRole('button', { name: /adicionar|add/i })
    await user.click(addBtn)

    const input = await screen.findByPlaceholderText(/buscar filme ou série/i)
    await user.type(input, 'xyz')

    expect(await screen.findByText('Nenhum resultado.')).toBeInTheDocument()
  })

  it('exibe erro de busca quando a Cloud Function falha', async () => {
    const { httpsCallable } = await import('firebase/functions')
    vi.mocked(httpsCallable).mockReturnValue(
      vi.fn(() => Promise.reject(new Error('Função indisponível'))) as never
    )

    const user = userEvent.setup()
    renderPage()

    const addBtn = await screen.findByRole('button', { name: /adicionar|add/i })
    await user.click(addBtn)

    const input = await screen.findByPlaceholderText(/buscar filme ou série/i)
    await user.type(input, 'abc')

    expect(await screen.findByText(/Erro na busca/i)).toBeInTheDocument()
  })
})

describe('WatchlistPage — sem usuário autenticado', () => {
  it('não falha ao renderizar sem user', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      loading: false,
      authError: null,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
    vi.mocked(dbApi.getMyPartnerships).mockResolvedValue([])
    vi.mocked(dbApi.getWatchlist).mockResolvedValue([])

    renderPage()
    expect(screen.getByText('Filmes & Séries')).toBeInTheDocument()
  })
})
