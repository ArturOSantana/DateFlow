/**
 * Testes unitários para as funções puras da WatchlistPage e lógica de negócio.
 *
 * Como as funções releaseYear, tmdbTitle, buildPool e filtros são internas
 * ao componente, extraímos a lógica aqui para testar diretamente.
 */
import { describe, it, expect } from 'vitest'
import type { WatchlistItem } from '../../types'

// ─── Funções extraídas para teste ─────────────────────────────────────────────

interface TmdbResult {
  id: number
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  media_type: 'movie' | 'tv'
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  release_date?: string
  first_air_date?: string
  vote_average: number
  genre_ids: number[]
}

function releaseYear(r: TmdbResult) {
  const d = r.release_date ?? r.first_air_date ?? ''
  return d.slice(0, 4) || '—'
}

function tmdbTitle(r: TmdbResult) {
  return r.title ?? r.name ?? r.original_title ?? r.original_name ?? '?'
}

function buildPool(items: WatchlistItem[], type: 'all' | 'movie' | 'tv') {
  return items.filter(i =>
    i.status === 'to_watch' && (type === 'all' || i.mediaType === type)
  )
}

function filterItems(
  items: WatchlistItem[],
  filterStatus: 'all' | 'to_watch' | 'watched',
  filterMedia: 'all' | 'movie' | 'tv',
) {
  return items.filter(i => {
    const okStatus = filterStatus === 'all' || i.status === filterStatus
    const okMedia  = filterMedia  === 'all' || i.mediaType === filterMedia
    return okStatus && okMedia
  })
}

// ─── Fixture helpers ──────────────────────────────────────────────────────────

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

function makeTmdbResult(overrides: Partial<TmdbResult> = {}): TmdbResult {
  return {
    id: 99,
    title: 'Interstellar',
    media_type: 'movie',
    poster_path: '/abc.jpg',
    backdrop_path: null,
    overview: 'Sci-fi epic',
    release_date: '2014-11-07',
    vote_average: 8.6,
    genre_ids: [878],
    ...overrides,
  }
}

// ─── releaseYear ──────────────────────────────────────────────────────────────

describe('releaseYear', () => {
  it('extrai o ano de release_date', () => {
    expect(releaseYear(makeTmdbResult({ release_date: '2023-06-15' }))).toBe('2023')
  })

  it('usa first_air_date quando release_date está ausente (TV)', () => {
    const r = makeTmdbResult({ release_date: undefined, first_air_date: '2020-01-01', media_type: 'tv' })
    expect(releaseYear(r)).toBe('2020')
  })

  it('retorna "—" quando não há data', () => {
    const r = makeTmdbResult({ release_date: undefined, first_air_date: undefined })
    expect(releaseYear(r)).toBe('—')
  })

  it('prioriza release_date sobre first_air_date', () => {
    const r = makeTmdbResult({ release_date: '2015-01-01', first_air_date: '2010-01-01' })
    expect(releaseYear(r)).toBe('2015')
  })
})

// ─── tmdbTitle ────────────────────────────────────────────────────────────────

describe('tmdbTitle', () => {
  it('retorna title quando disponível', () => {
    expect(tmdbTitle(makeTmdbResult({ title: 'Inception' }))).toBe('Inception')
  })

  it('usa name quando title está ausente (TV)', () => {
    const r = makeTmdbResult({ title: undefined, name: 'Breaking Bad', media_type: 'tv' })
    expect(tmdbTitle(r)).toBe('Breaking Bad')
  })

  it('usa original_title como fallback', () => {
    const r = makeTmdbResult({ title: undefined, name: undefined, original_title: 'Parasite' })
    expect(tmdbTitle(r)).toBe('Parasite')
  })

  it('usa original_name como último fallback', () => {
    const r = makeTmdbResult({ title: undefined, name: undefined, original_title: undefined, original_name: 'K-Drama' })
    expect(tmdbTitle(r)).toBe('K-Drama')
  })

  it('retorna "?" quando nenhum campo de título está disponível', () => {
    const r = makeTmdbResult({ title: undefined, name: undefined, original_title: undefined, original_name: undefined })
    expect(tmdbTitle(r)).toBe('?')
  })
})

// ─── buildPool ────────────────────────────────────────────────────────────────

describe('buildPool', () => {
  const items = [
    makeItem({ id: '1', mediaType: 'movie', status: 'to_watch' }),
    makeItem({ id: '2', mediaType: 'tv',    status: 'to_watch' }),
    makeItem({ id: '3', mediaType: 'movie', status: 'watched'  }),
    makeItem({ id: '4', mediaType: 'tv',    status: 'watched'  }),
    makeItem({ id: '5', mediaType: 'movie', status: 'to_watch' }),
  ]

  it('retorna todos os "to_watch" quando type = all', () => {
    const pool = buildPool(items, 'all')
    expect(pool).toHaveLength(3)
    expect(pool.map(i => i.id)).toEqual(['1', '2', '5'])
  })

  it('filtra somente filmes to_watch', () => {
    const pool = buildPool(items, 'movie')
    expect(pool).toHaveLength(2)
    expect(pool.every(i => i.mediaType === 'movie')).toBe(true)
  })

  it('filtra somente séries to_watch', () => {
    const pool = buildPool(items, 'tv')
    expect(pool).toHaveLength(1)
    expect(pool[0].mediaType).toBe('tv')
  })

  it('retorna array vazio quando não há itens to_watch', () => {
    const watched = items.filter(i => i.status === 'watched')
    expect(buildPool(watched, 'all')).toHaveLength(0)
  })
})

// ─── filterItems ──────────────────────────────────────────────────────────────

describe('filterItems', () => {
  const items = [
    makeItem({ id: '1', mediaType: 'movie', status: 'to_watch' }),
    makeItem({ id: '2', mediaType: 'tv',    status: 'to_watch' }),
    makeItem({ id: '3', mediaType: 'movie', status: 'watched'  }),
    makeItem({ id: '4', mediaType: 'tv',    status: 'watched'  }),
  ]

  it('sem filtros retorna todos os itens', () => {
    expect(filterItems(items, 'all', 'all')).toHaveLength(4)
  })

  it('filtra por status to_watch', () => {
    const result = filterItems(items, 'to_watch', 'all')
    expect(result).toHaveLength(2)
    expect(result.every(i => i.status === 'to_watch')).toBe(true)
  })

  it('filtra por status watched', () => {
    const result = filterItems(items, 'watched', 'all')
    expect(result).toHaveLength(2)
    expect(result.every(i => i.status === 'watched')).toBe(true)
  })

  it('filtra por media movie', () => {
    const result = filterItems(items, 'all', 'movie')
    expect(result).toHaveLength(2)
    expect(result.every(i => i.mediaType === 'movie')).toBe(true)
  })

  it('filtra por media tv', () => {
    const result = filterItems(items, 'all', 'tv')
    expect(result).toHaveLength(2)
    expect(result.every(i => i.mediaType === 'tv')).toBe(true)
  })

  it('combina filtro de status e media', () => {
    const result = filterItems(items, 'watched', 'movie')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('3')
  })

  it('retorna vazio quando combinação não bate', () => {
    expect(filterItems([], 'to_watch', 'movie')).toHaveLength(0)
  })
})

// ─── getMyReview / getPartnerReview (lógica de ownership) ────────────────────

describe('lógica de review (ownership)', () => {
  const ownerReview   = { rating: 5, comment: 'Ótimo!', reviewedAt: 9999 }
  const partnerReview = { rating: 4, comment: 'Bom.',   reviewedAt: 9998 }

  function getMyReview(item: WatchlistItem, userId: string) {
    return item.addedByUserId === userId ? item.ownerReview : item.partnerReview
  }

  function getPartnerReview(item: WatchlistItem, userId: string) {
    return item.addedByUserId === userId ? item.partnerReview : item.ownerReview
  }

  it('dono vê ownerReview como "minha avaliação"', () => {
    const item = makeItem({ addedByUserId: 'user1', ownerReview, partnerReview })
    expect(getMyReview(item, 'user1')).toBe(ownerReview)
  })

  it('parceiro vê partnerReview como "minha avaliação"', () => {
    const item = makeItem({ addedByUserId: 'user1', ownerReview, partnerReview })
    expect(getMyReview(item, 'user2')).toBe(partnerReview)
  })

  it('dono vê partnerReview como "avaliação do parceiro"', () => {
    const item = makeItem({ addedByUserId: 'user1', ownerReview, partnerReview })
    expect(getPartnerReview(item, 'user1')).toBe(partnerReview)
  })

  it('parceiro vê ownerReview como "avaliação do dono"', () => {
    const item = makeItem({ addedByUserId: 'user1', ownerReview, partnerReview })
    expect(getPartnerReview(item, 'user2')).toBe(ownerReview)
  })

  it('retorna undefined quando a avaliação ainda não existe', () => {
    const item = makeItem({ addedByUserId: 'user1', ownerReview: undefined, partnerReview: undefined })
    expect(getMyReview(item, 'user1')).toBeUndefined()
    expect(getPartnerReview(item, 'user1')).toBeUndefined()
  })
})

// ─── coupleIds snapshot ───────────────────────────────────────────────────────

describe('coupleIds — construção do payload handleAdd', () => {
  it('inclui somente o usuário quando não há parceiro', () => {
    const userId = 'user1'
    const partnerId = null
    const coupleIds = partnerId ? [userId, partnerId] : [userId]
    expect(coupleIds).toEqual(['user1'])
  })

  it('inclui ambos quando há parceiro', () => {
    const userId = 'user1'
    const partnerId = 'user2'
    const coupleIds = partnerId ? [userId, partnerId] : [userId]
    expect(coupleIds).toEqual(['user1', 'user2'])
  })
})

// ─── tmdbRating rounding ──────────────────────────────────────────────────────

describe('tmdbRating — arredondamento', () => {
  it.each([
    [8.567, 8.6],
    [7.0,   7.0],
    [9.999, 10.0],
    [0.0,   0.0],
    [6.549, 6.5],
  ])('voteAverage %f → tmdbRating %f', (voteAverage, expected) => {
    const tmdbRating = Math.round(voteAverage * 10) / 10
    expect(tmdbRating).toBeCloseTo(expected, 1)
  })
})

// ─── genres mapping ───────────────────────────────────────────────────────────

describe('genre_ids → labels', () => {
  const TMDB_GENRES: Record<number, string> = {
    28: 'Ação', 18: 'Drama', 35: 'Comédia', 27: 'Terror',
    10749: 'Romance', 878: 'Ficção Científica',
  }

  it('mapeia ids conhecidos corretamente', () => {
    const ids = [28, 18, 35]
    const genres = ids.map(id => TMDB_GENRES[id]).filter(Boolean)
    expect(genres).toEqual(['Ação', 'Drama', 'Comédia'])
  })

  it('descarta ids desconhecidos', () => {
    const ids = [28, 9999, 18]
    const genres = ids.map(id => TMDB_GENRES[id]).filter(Boolean)
    expect(genres).toEqual(['Ação', 'Drama'])
  })

  it('limita a 3 gêneros no payload', () => {
    const ids = [28, 18, 35, 27, 10749]
    const genres = ids.map(id => TMDB_GENRES[id]).filter(Boolean).slice(0, 3)
    expect(genres).toHaveLength(3)
    expect(genres).toEqual(['Ação', 'Drama', 'Comédia'])
  })
})
