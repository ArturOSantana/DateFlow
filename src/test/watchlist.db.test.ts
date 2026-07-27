/**
 * Testes para as funções de acesso ao Firestore relacionadas à watchlist.
 * Usa mocks do Firebase para não fazer chamadas reais.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks inline (vi.mock é hoisted automaticamente pelo Vitest) ─────────────

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

// ─── Imports tardios ──────────────────────────────────────────────────────────

import * as firestoreModule from 'firebase/firestore'
import type { WatchlistItem, WatchlistReview } from '@/types'

// ─── Helpers de fixture ───────────────────────────────────────────────────────

function makeItem(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: 'item1',
    addedByUserId: 'user1',
    addedByName: 'Alice',
    coupleIds: ['user1', 'user2'],
    tmdbId: 1,
    title: 'Meu Filme',
    originalTitle: 'My Movie',
    mediaType: 'movie',
    posterPath: '/poster.jpg',
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

// ─── getWatchlist ─────────────────────────────────────────────────────────────

describe('getWatchlist', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('retorna itens retornados pelo getDocs', async () => {
    const mockItems = [
      makeItem({ id: 'a', title: 'Filme A' }),
      makeItem({ id: 'b', title: 'Filme B', mediaType: 'tv' }),
    ]

    vi.mocked(firestoreModule.collection).mockReturnValue('col' as never)
    vi.mocked(firestoreModule.where).mockReturnValue('where' as never)
    vi.mocked(firestoreModule.orderBy).mockReturnValue('orderBy' as never)
    vi.mocked(firestoreModule.query).mockReturnValue('query' as never)
    vi.mocked(firestoreModule.getDocs).mockResolvedValue({
      docs: mockItems.map(item => ({
        id: item.id,
        data: () => {
          const { id: _id, ...rest } = item
          return rest
        },
      })),
    } as never)

    const { getWatchlist } = await import('@/lib/db')
    const result = await getWatchlist('user1', 'user2')

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('a')
    expect(result[0].title).toBe('Filme A')
    expect(result[1].id).toBe('b')
    expect(result[1].mediaType).toBe('tv')
  })

  it('usa array-contains com coupleId1', async () => {
    vi.mocked(firestoreModule.collection).mockReturnValue('col' as never)
    vi.mocked(firestoreModule.where).mockReturnValue('where' as never)
    vi.mocked(firestoreModule.orderBy).mockReturnValue('orderBy' as never)
    vi.mocked(firestoreModule.query).mockReturnValue('query' as never)
    vi.mocked(firestoreModule.getDocs).mockResolvedValue({ docs: [] } as never)

    const { getWatchlist } = await import('@/lib/db')
    await getWatchlist('user1', 'user2')

    expect(firestoreModule.where).toHaveBeenCalledWith('coupleIds', 'array-contains', 'user1')
  })

  it('ordena por createdAt desc', async () => {
    vi.mocked(firestoreModule.collection).mockReturnValue('col' as never)
    vi.mocked(firestoreModule.where).mockReturnValue('where' as never)
    vi.mocked(firestoreModule.orderBy).mockReturnValue('orderBy' as never)
    vi.mocked(firestoreModule.query).mockReturnValue('query' as never)
    vi.mocked(firestoreModule.getDocs).mockResolvedValue({ docs: [] } as never)

    const { getWatchlist } = await import('@/lib/db')
    await getWatchlist('user1', 'user2')

    expect(firestoreModule.orderBy).toHaveBeenCalledWith('createdAt', 'desc')
  })

  it('retorna array vazio quando não há documentos', async () => {
    vi.mocked(firestoreModule.collection).mockReturnValue('col' as never)
    vi.mocked(firestoreModule.where).mockReturnValue('where' as never)
    vi.mocked(firestoreModule.orderBy).mockReturnValue('orderBy' as never)
    vi.mocked(firestoreModule.query).mockReturnValue('query' as never)
    vi.mocked(firestoreModule.getDocs).mockResolvedValue({ docs: [] } as never)

    const { getWatchlist } = await import('@/lib/db')
    const result = await getWatchlist('user1', '')
    expect(result).toEqual([])
  })
})

// ─── addWatchlistItem ─────────────────────────────────────────────────────────

describe('addWatchlistItem', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('chama addDoc e retorna o id gerado', async () => {
    vi.mocked(firestoreModule.collection).mockReturnValue('col' as never)
    vi.mocked(firestoreModule.addDoc).mockResolvedValue({ id: 'new-id-123' } as never)

    const { addWatchlistItem } = await import('@/lib/db')
    const payload = makeItem()
    const { id: _id, createdAt: _c, updatedAt: _u, ...data } = payload
    const result = await addWatchlistItem(data)

    expect(result).toBe('new-id-123')
    expect(firestoreModule.addDoc).toHaveBeenCalledOnce()
  })

  it('inclui campos createdAt e updatedAt ao gravar', async () => {
    vi.mocked(firestoreModule.collection).mockReturnValue('col' as never)
    vi.mocked(firestoreModule.addDoc).mockResolvedValue({ id: 'new-id' } as never)

    const { addWatchlistItem } = await import('@/lib/db')
    const payload = makeItem()
    const { id: _id, createdAt: _c, updatedAt: _u, ...data } = payload
    await addWatchlistItem(data)

    const callArg = vi.mocked(firestoreModule.addDoc).mock.calls[0][1] as Record<string, unknown>
    expect(callArg).toHaveProperty('createdAt')
    expect(callArg).toHaveProperty('updatedAt')
    expect(typeof callArg.createdAt).toBe('number')
    expect(typeof callArg.updatedAt).toBe('number')
  })
})

// ─── updateWatchlistItem ──────────────────────────────────────────────────────

describe('updateWatchlistItem', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('chama updateDoc com os campos corretos', async () => {
    vi.mocked(firestoreModule.doc).mockReturnValue('docRef' as never)
    vi.mocked(firestoreModule.updateDoc).mockResolvedValue(undefined)

    const { updateWatchlistItem } = await import('@/lib/db')
    await updateWatchlistItem('item1', { status: 'watched' })

    expect(firestoreModule.updateDoc).toHaveBeenCalledOnce()
    const callArg = vi.mocked(firestoreModule.updateDoc).mock.calls[0][1] as Record<string, unknown>
    expect(callArg.status).toBe('watched')
    expect(callArg).toHaveProperty('updatedAt')
  })
})

// ─── deleteWatchlistItem ──────────────────────────────────────────────────────

describe('deleteWatchlistItem', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('chama deleteDoc com o doc correto', async () => {
    vi.mocked(firestoreModule.doc).mockReturnValue('docRef' as never)
    vi.mocked(firestoreModule.deleteDoc).mockResolvedValue(undefined)

    const { deleteWatchlistItem } = await import('@/lib/db')
    await deleteWatchlistItem('item1')

    expect(firestoreModule.deleteDoc).toHaveBeenCalledOnce()
    expect(firestoreModule.deleteDoc).toHaveBeenCalledWith('docRef')
  })
})

// ─── setWatchlistReview ───────────────────────────────────────────────────────

describe('setWatchlistReview', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('grava ownerReview com updateDoc', async () => {
    vi.mocked(firestoreModule.doc).mockReturnValue('docRef' as never)
    vi.mocked(firestoreModule.updateDoc).mockResolvedValue(undefined)

    const review: WatchlistReview = { rating: 5, comment: 'Top!', reviewedAt: 123456 }
    const { setWatchlistReview } = await import('@/lib/db')
    await setWatchlistReview('item1', 'ownerReview', review)

    expect(firestoreModule.updateDoc).toHaveBeenCalledOnce()
    const callArg = vi.mocked(firestoreModule.updateDoc).mock.calls[0][1] as Record<string, unknown>
    expect(callArg.ownerReview).toEqual(review)
    expect(callArg).toHaveProperty('updatedAt')
  })

  it('grava partnerReview com updateDoc', async () => {
    vi.mocked(firestoreModule.doc).mockReturnValue('docRef' as never)
    vi.mocked(firestoreModule.updateDoc).mockResolvedValue(undefined)

    const review: WatchlistReview = { rating: 3, reviewedAt: 123456 }
    const { setWatchlistReview } = await import('@/lib/db')
    await setWatchlistReview('item2', 'partnerReview', review)

    const callArg = vi.mocked(firestoreModule.updateDoc).mock.calls[0][1] as Record<string, unknown>
    expect(callArg.partnerReview).toEqual(review)
  })

  it('nunca mistura ownerReview e partnerReview no mesmo campo', async () => {
    vi.mocked(firestoreModule.doc).mockReturnValue('docRef' as never)
    vi.mocked(firestoreModule.updateDoc).mockResolvedValue(undefined)

    const review: WatchlistReview = { rating: 4, reviewedAt: 1 }
    const { setWatchlistReview } = await import('@/lib/db')
    await setWatchlistReview('item3', 'ownerReview', review)

    const callArg = vi.mocked(firestoreModule.updateDoc).mock.calls[0][1] as Record<string, unknown>
    expect(callArg).not.toHaveProperty('partnerReview')
    expect(callArg).toHaveProperty('ownerReview')
  })
})
