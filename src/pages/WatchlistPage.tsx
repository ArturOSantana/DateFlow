import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Popcorn,
  Search,
  Plus,
  Trash2,
  Star,
  Shuffle,
  CheckCircle2,
  Clock,
  Film,
  Tv2,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import * as dbApi from '../lib/db'
import type { WatchlistItem, WatchlistMediaType, WatchlistReview } from '../types'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { getFunctions, httpsCallable } from 'firebase/functions'

// ─── TMDB helpers ─────────────────────────────────────────────────────────────

const POSTER_SM = 'https://image.tmdb.org/t/p/w185'
const POSTER_LG = 'https://image.tmdb.org/t/p/w500'

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

const TMDB_GENRES: Record<number, string> = {
  28:'Ação',18:'Drama',35:'Comédia',27:'Terror',10749:'Romance',878:'Ficção Científica',
  12:'Aventura',14:'Fantasia',80:'Crime',99:'Documentário',10751:'Família',36:'História',
  10402:'Música',9648:'Mistério',10752:'Guerra',37:'Faroeste',16:'Animação',
  10759:'Ação & Aventura',10762:'Kids',10763:'Notícias',10764:'Reality',10765:'Sci-Fi & Fantasia',
  10766:'Soap',10767:'Talk',10768:'Guerra & Política',10770:'TV Movie',
}

async function searchTmdb(q: string): Promise<TmdbResult[]> {
  const fn = httpsCallable<{ q: string }, { results: TmdbResult[] }>(
    getFunctions(undefined, 'southamerica-east1'),
    'tmdbSearch',
  )
  const res = await fn({ q })
  return (res.data.results ?? []).filter(r => r.media_type === 'movie' || r.media_type === 'tv')
}

function releaseYear(r: TmdbResult) {
  const d = r.release_date ?? r.first_air_date ?? ''
  return d.slice(0, 4) || '—'
}

function tmdbTitle(r: TmdbResult) {
  return r.title ?? r.name ?? r.original_title ?? r.original_name ?? '?'
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({
  value, onChange, size = 18,
}: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHovered(n)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={`p-0.5 ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            size={size}
            className={n <= display ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'to_watch' | 'watched'
type FilterMedia  = 'all' | 'movie' | 'tv'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const { user } = useAuth()

  const [partnerId,    setPartnerId]    = useState<string | null>(null)
  const [partnerName,  setPartnerName]  = useState('')
  const [items,        setItems]        = useState<WatchlistItem[]>([])
  const [loading,      setLoading]      = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterMedia,  setFilterMedia]  = useState<FilterMedia>('all')
  const [filterOpen,   setFilterOpen]   = useState(false)
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null)
  const [searchError,  setSearchError]  = useState<string | null>(null)

  // busca
  const [searchOpen,    setSearchOpen]    = useState(false)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState<TmdbResult[]>([])
  const [searching,     setSearching]     = useState(false)
  const [adding,        setAdding]        = useState<number | null>(null)

  // avaliação
  const [detailItem,    setDetailItem]    = useState<WatchlistItem | null>(null)
  const [reviewModal,   setReviewModal]   = useState(false)
  const [reviewRating,  setReviewRating]  = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [savingReview,  setSavingReview]  = useState(false)

  // sorteio
  const [luckyItem,    setLuckyItem]    = useState<WatchlistItem | null>(null)
  const [luckyModal,   setLuckyModal]   = useState(false)
  const [drawing,      setDrawing]      = useState(false)
  const [displayItem,  setDisplayItem]  = useState<WatchlistItem | null>(null)
  const [drawFilter,   setDrawFilter]   = useState<'all' | 'movie' | 'tv'>('all')
  const drawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // parceiro ativo
  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const all = await dbApi.getMyPartnerships(user.uid, user.email ?? undefined)
      const active = all.find(p => p.status === 'accepted')
      if (!active || cancelled) return
      const pid  = active.requesterId === user.uid ? active.recipientId : active.requesterId
      const name = active.requesterId === user.uid ? active.recipientName : active.requesterName
      if (!cancelled) { setPartnerId(pid || null); setPartnerName(name || '') }
    })()
    return () => { cancelled = true }
  }, [user])

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      console.log('[watchlist] getWatchlist uid=', user.uid, 'partnerId=', partnerId)
      const data = await dbApi.getWatchlist(user.uid, partnerId ?? '')
      console.log('[watchlist] getWatchlist ok, items=', data.length)
      setItems(data)
    } catch (err) {
      console.error('[watchlist] refresh error (getWatchlist):', err)
      setErrorMsg(`Erro ao carregar lista: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }, [user, partnerId])

  useEffect(() => { refresh() }, [refresh])

  // debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setSearchError(null); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setSearchError(null)
      try {
        const results = await searchTmdb(searchQuery)
        console.log('[watchlist] searchTmdb results=', results.length, results.map(r => r.title ?? r.name))
        setSearchResults(results)
      } catch (err: unknown) {
        console.error('[watchlist] searchTmdb error:', err)
        const msg = err instanceof Error ? err.message : String(err)
        setSearchError(`Erro na busca: ${msg}`)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  async function handleAdd(r: TmdbResult) {
    if (!user) return
    setAdding(r.id)
    setErrorMsg(null)
    try {
      const coupleIds = partnerId ? [user.uid, partnerId] : [user.uid]
      console.log('[watchlist] handleAdd uid=', user.uid, 'coupleIds=', coupleIds, 'tmdb=', r.id)
      const payload: Omit<WatchlistItem, 'id' | 'createdAt' | 'updatedAt'> = {
        addedByUserId:  user.uid,
        addedByName:    user.displayName ?? user.email ?? 'Você',
        coupleIds,
        tmdbId:         r.id,
        title:          tmdbTitle(r),
        originalTitle:  r.original_title ?? r.original_name ?? tmdbTitle(r),
        mediaType:      r.media_type as WatchlistMediaType,
        posterPath:     r.poster_path,
        backdropPath:   r.backdrop_path,
        overview:       r.overview,
        releaseYear:    releaseYear(r),
        tmdbRating:     Math.round(r.vote_average * 10) / 10,
        genres:         (r.genre_ids ?? []).map(id => TMDB_GENRES[id]).filter(Boolean).slice(0, 3),
        status:         'to_watch',
      }
      // 1) Grava no Firestore — se isso falhar, mostra erro
      await dbApi.addWatchlistItem(payload)

      // 2) Fecha o modal imediatamente (escrita já foi bem-sucedida)
      setSearchOpen(false)
      setSearchQuery('')
      setSearchResults([])

      // 3) Atualiza a lista — falha silenciosa enquanto índice é construído
      await refresh()
    } catch (err: unknown) {
      console.error('[watchlist] handleAdd error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(`Erro ao adicionar: ${msg}`)
    } finally {
      setAdding(null)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Remover da lista?')) return
    await dbApi.deleteWatchlistItem(id)
    await refresh()
  }

  async function markWatched(item: WatchlistItem) {
    await dbApi.updateWatchlistItem(item.id, { status: 'watched' })
    await refresh()
  }

  function getMyReview(item: WatchlistItem): WatchlistReview | undefined {
    if (!user) return undefined
    return item.addedByUserId === user.uid ? item.ownerReview : item.partnerReview
  }

  function getPartnerReview(item: WatchlistItem): WatchlistReview | undefined {
    if (!user) return undefined
    return item.addedByUserId === user.uid ? item.partnerReview : item.ownerReview
  }

  function openReview(item: WatchlistItem) {
    setDetailItem(item)
    const mine = getMyReview(item)
    setReviewRating(mine?.rating ?? 0)
    setReviewComment(mine?.comment ?? '')
    setReviewModal(true)
  }

  async function saveReview() {
    if (!detailItem || !user) return
    setSavingReview(true)
    try {
      const field: 'ownerReview' | 'partnerReview' =
        detailItem.addedByUserId === user.uid ? 'ownerReview' : 'partnerReview'
      const review: WatchlistReview = {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
        reviewedAt: Date.now(),
      }
      await dbApi.setWatchlistReview(detailItem.id, field, review)
      if (detailItem.status === 'to_watch') {
        await dbApi.updateWatchlistItem(detailItem.id, { status: 'watched' })
      }
      await refresh()
      setReviewModal(false)
    } finally {
      setSavingReview(false)
    }
  }

  function runDrawAnimation(pool: WatchlistItem[], winner: WatchlistItem) {
    setDrawing(true)
    setDisplayItem(pool[Math.floor(Math.random() * pool.length)])
    const TOTAL_STEPS = 18
    const BASE_DELAY  = 60
    let step = 0
    function tick() {
      step++
      const delay = BASE_DELAY + Math.pow(step / TOTAL_STEPS, 2) * 340
      setDisplayItem(pool[Math.floor(Math.random() * pool.length)])
      if (step < TOTAL_STEPS) {
        drawTimerRef.current = setTimeout(tick, delay)
      } else {
        setDisplayItem(winner)
        setLuckyItem(winner)
        setDrawing(false)
      }
    }
    drawTimerRef.current = setTimeout(tick, BASE_DELAY)
  }

  function buildPool(type: 'all' | 'movie' | 'tv') {
    return items.filter(i =>
      i.status === 'to_watch' && (type === 'all' || i.mediaType === type)
    )
  }

  function drawRandom() {
    setLuckyItem(null)
    setDisplayItem(null)
    setLuckyModal(true)
  }

  function startDraw() {
    const pool = buildPool(drawFilter)
    if (pool.length === 0) return
    const winner = pool[Math.floor(Math.random() * pool.length)]
    if (drawTimerRef.current) clearTimeout(drawTimerRef.current)
    runDrawAnimation(pool, winner)
  }

  const filtered = items.filter(i => {
    const okStatus = filterStatus === 'all' || i.status === filterStatus
    const okMedia  = filterMedia  === 'all' || i.mediaType === filterMedia
    return okStatus && okMedia
  })

  const toWatchCount = items.filter(i => i.status === 'to_watch').length
  const watchedCount = items.filter(i => i.status === 'watched').length

  const activeFilters =
    (filterStatus !== 'all' ? 1 : 0) + (filterMedia !== 'all' ? 1 : 0)

  // ─── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-7 max-w-3xl mx-auto">

      {/* ── Banner de erro global ── */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700 flex items-start gap-2">
          <span className="shrink-0 mt-0.5">⚠</span>
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="shrink-0 text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h1 className="text-base font-semibold text-stone-900 leading-tight">Filmes & Séries</h1>
          {/* Botão Adicionar (destaque) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="btn-primary shrink-0"
          >
            <Plus size={14} />
            <span className="hidden xs:inline">Adicionar</span>
            <span className="xs:hidden">Add</span>
          </button>
        </div>

        {/* Counters + Sortear na mesma linha */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-stone-400">
            {toWatchCount} pra assistir · {watchedCount} assistidos
          </p>
          <button
            onClick={drawRandom}
            disabled={toWatchCount === 0}
            className="btn-secondary py-1.5 px-3 text-xs shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Shuffle size={12} />
            Sortear
          </button>
        </div>
      </div>

      {/* ── Filtros (collapsible no mobile) ── */}
      <div className="mb-5">
        {/* Trigger visível em mobile */}
        <button
          onClick={() => setFilterOpen(o => !o)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors md:hidden ${
            activeFilters > 0
              ? 'bg-stone-900 text-white border-stone-900'
              : 'border-stone-200 text-stone-600 bg-white'
          }`}
        >
          <SlidersHorizontal size={12} />
          Filtros
          {activeFilters > 0 && (
            <span className="ml-0.5 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {activeFilters}
            </span>
          )}
          <ChevronDown
            size={12}
            className={`ml-auto transition-transform ${filterOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Painel de filtros — sempre visível em md+, colapsável em mobile */}
        <div className={`mt-2 flex flex-wrap gap-2 md:mt-0 md:flex ${filterOpen ? 'flex' : 'hidden'}`}>
          {/* Status */}
          <div className="flex rounded-xl border border-stone-200 overflow-hidden">
            {(['all', 'to_watch', 'watched'] as FilterStatus[]).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  filterStatus === s ? 'bg-stone-900 text-white' : 'text-stone-500 bg-white hover:bg-stone-50'
                }`}
              >
                {s === 'all' ? 'Todos' : s === 'to_watch' ? 'Pra assistir' : 'Assistidos'}
              </button>
            ))}
          </div>

          {/* Tipo de mídia */}
          <div className="flex rounded-xl border border-stone-200 overflow-hidden">
            {(['all', 'movie', 'tv'] as FilterMedia[]).map(m => (
              <button
                key={m}
                onClick={() => setFilterMedia(m)}
                className={`px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-1 ${
                  filterMedia === m ? 'bg-stone-900 text-white' : 'text-stone-500 bg-white hover:bg-stone-50'
                }`}
              >
                {m === 'movie' && <Film size={11} />}
                {m === 'tv'    && <Tv2  size={11} />}
                {m === 'all' ? 'Tudo' : m === 'movie' ? 'Filmes' : 'Séries'}
              </button>
            ))}
          </div>
        </div>
      </div>


      {/* ── Lista ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-3.5 flex gap-3" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className="skeleton shrink-0 w-[68px] min-h-[102px] rounded-lg" />
              <div className="flex-1 flex flex-col gap-2 py-1">
                <div className="skeleton h-3 w-16 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-12 rounded mt-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Popcorn size={36} />}
          title={activeFilters > 0 ? 'Nenhum resultado para esses filtros' : 'Lista vazia'}
          description="Adicione filmes e séries que vocês queiram assistir juntos."
          action={
            <button onClick={() => setSearchOpen(true)} className="btn-primary">
              <Plus size={14} /> Buscar título
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((item, idx) => (
            <WatchlistCard
              key={item.id}
              item={item}
              index={idx}
              isOwner={item.addedByUserId === user?.uid}
              myReview={getMyReview(item)}
              partnerReview={getPartnerReview(item)}
              partnerName={partnerName}
              onDelete={() => handleDelete(item.id)}
              onMarkWatched={() => markWatched(item)}
              onReview={() => openReview(item)}
            />
          ))}
        </div>
      )}

      {/* ════ Modal: busca ════ */}
      <Modal
        open={searchOpen}
        onClose={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]) }}
        title="Buscar filme ou série"
      >
        <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                autoFocus
                className="input pl-8"
                placeholder="Buscar filme ou série…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {searching && (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
              </div>
            )}

            {!searching && searchError && (
              <p className="text-sm text-red-500 text-center py-6">{searchError}</p>
            )}

            {!searching && !searchError && searchResults.length > 0 && (
              <div className="space-y-1 max-h-[55vh] overflow-y-auto -mx-1 px-1">
                {searchResults.slice(0, 12).map((r, idx) => (
                  <TmdbResultRow
                    key={r.id}
                    result={r}
                    index={idx}
                    alreadyAdded={items.some(i => i.tmdbId === r.id)}
                    isLoading={adding === r.id}
                    onAdd={() => handleAdd(r)}
                  />
                ))}
              </div>
            )}

            {!searching && !searchError && searchQuery.trim() && searchResults.length === 0 && (
              <p className="text-sm text-stone-400 text-center py-6">Nenhum resultado.</p>
            )}

            {!searchQuery.trim() && (
              <p className="text-xs text-stone-400 text-center py-4">
                Digite o nome para buscar
              </p>
            )}
        </div>
      </Modal>

      {/* ════ Modal: avaliação ════ */}
      <Modal
        open={reviewModal}
        onClose={() => setReviewModal(false)}
        title="Avaliar"
      >
        {detailItem && (
          <div className="space-y-4">
            {/* Título + poster */}
            <div className="flex gap-3 items-start">
              {detailItem.posterPath ? (
                <img
                  src={`${POSTER_SM}${detailItem.posterPath}`}
                  alt={detailItem.title}
                  className="w-14 h-[84px] object-cover rounded-lg shrink-0 bg-stone-100"
                />
              ) : (
                <div className="w-14 h-[84px] bg-stone-100 rounded-lg flex items-center justify-center shrink-0">
                  <Popcorn size={20} className="text-stone-300" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-stone-900 text-sm leading-snug">{detailItem.title}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {detailItem.releaseYear} · {detailItem.mediaType === 'movie' ? 'Filme' : 'Série'}
                </p>
                {detailItem.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {detailItem.genres.map(g => (
                      <span key={g} className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full">{g}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Avaliação do usuário */}
            <div>
              <label className="label mb-2">Sua avaliação</label>
              <StarRating value={reviewRating} onChange={setReviewRating} size={28} />
            </div>

            <div>
              <label className="label">Comentário (opcional)</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder=""
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
              />
            </div>

            {/* Avaliação do parceiro */}
            {getPartnerReview(detailItem) && (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <p className="text-xs font-semibold text-stone-600 mb-1.5">
                  Avaliação de {partnerName || 'parceiro/a'}
                </p>
                <StarRating value={getPartnerReview(detailItem)!.rating} size={16} />
                {getPartnerReview(detailItem)!.comment && (
                  <p className="text-xs text-stone-500 mt-1.5 italic leading-relaxed">
                    "{getPartnerReview(detailItem)!.comment}"
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setReviewModal(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                onClick={saveReview}
                disabled={reviewRating === 0 || savingReview}
                className="btn-primary flex-1 justify-center disabled:opacity-50"
              >
                {savingReview ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ════ Modal: sorteio ════ */}
      <Modal
        open={luckyModal}
        onClose={() => { if (!drawing) { if (drawTimerRef.current) clearTimeout(drawTimerRef.current); setLuckyModal(false) } }}
        title={drawing ? 'Sorteando…' : luckyItem ? 'Título sorteado' : 'Sortear'}
      >
        <>
          <style>{`
            @keyframes wl-flip-in {
              from { opacity: 0; transform: translateY(-10px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0)      scale(1);    }
            }
            @keyframes wl-winner-pop {
              0%   { opacity: 0; transform: scale(0.85); }
              60%  { transform: scale(1.04); }
              100% { opacity: 1; transform: scale(1); }
            }
            .wl-slot-item { animation: wl-flip-in 0.12s ease-out both; }
            .wl-winner    { animation: wl-winner-pop 0.45s cubic-bezier(.34,1.56,.64,1) both; }
          `}</style>

          {/* ── Seletor de tipo ── */}
          {!drawing && (
            <div className="flex gap-1.5 mb-4 p-1 bg-stone-100 rounded-xl">
              {([
                { value: 'all',   label: 'Ambos',   Icon: Popcorn },
                { value: 'movie', label: 'Filmes',  Icon: Film    },
                { value: 'tv',    label: 'Séries',  Icon: Tv2     },
              ] as const).map(({ value, label, Icon }) => {
                const count = buildPool(value).length
                return (
                  <button
                    key={value}
                    onClick={() => {
                      setDrawFilter(value)
                      setLuckyItem(null)
                      setDisplayItem(null)
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors
                      ${drawFilter === value
                        ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                        : 'text-stone-400 hover:text-stone-700'
                      } ${count === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    disabled={count === 0}
                  >
                    <Icon size={12} />
                    {label}
                    <span className={`text-[10px] rounded-full px-1 ${drawFilter === value ? 'bg-stone-100 text-stone-500' : 'text-stone-400'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Resultado ── */}
          {(displayItem ?? luckyItem) && (() => {
            const item = displayItem ?? luckyItem!
            return (
              <div className="space-y-4">
                {/* Imagem com animação */}
                <div key={drawing ? item.id + '-drawing' : item.id + '-winner'} className={drawing ? 'wl-slot-item' : 'wl-winner'}>
                  {item.backdropPath ? (
                    <div className="rounded-xl overflow-hidden -mx-5 -mt-4">
                      <img
                        src={`https://image.tmdb.org/t/p/w780${item.backdropPath}`}
                        alt=""
                        className="w-full h-36 object-cover"
                        style={drawing ? { filter: 'blur(1.5px) brightness(0.85)' } : {}}
                      />
                    </div>
                  ) : item.posterPath ? (
                    <div className="flex justify-center">
                      <img
                        src={`${POSTER_LG}${item.posterPath}`}
                        alt={item.title}
                        className="h-44 rounded-xl object-cover"
                        style={drawing ? { filter: 'blur(1.5px) brightness(0.85)' } : {}}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-stone-100 rounded-xl flex items-center justify-center">
                      <Popcorn size={32} className={drawing ? 'text-stone-200' : 'text-stone-300'} />
                    </div>
                  )}

                  {/* Info */}
                  <div className="mt-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      {item.mediaType === 'movie'
                        ? <Film size={12} className="text-stone-400" />
                        : <Tv2  size={12} className="text-stone-400" />}
                      <span className="text-xs text-stone-400">
                        {item.mediaType === 'movie' ? 'Filme' : 'Série'} · {item.releaseYear}
                      </span>
                      {item.tmdbRating > 0 && (
                        <>
                          <span className="text-stone-200">·</span>
                          <Star size={10} className="text-amber-400 fill-amber-400" />
                          <span className="text-xs text-stone-500 font-semibold">{item.tmdbRating.toFixed(1)}</span>
                        </>
                      )}
                    </div>
                    <p className={`text-lg font-bold leading-snug transition-colors duration-200 ${drawing ? 'text-stone-300' : 'text-stone-900'}`}>
                      {item.title}
                    </p>

                    {!drawing && item.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.genres.map(g => (
                          <span key={g} className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{g}</span>
                        ))}
                      </div>
                    )}

                    {!drawing && item.overview && (
                      <p className="text-xs text-stone-500 mt-2 leading-relaxed line-clamp-3">{item.overview}</p>
                    )}
                  </div>
                </div>

                {/* Indicador de loading */}
                {drawing && (
                  <div className="flex justify-center gap-1 py-1">
                    {[0,1,2].map(i => (
                      <span
                        key={i}
                        style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.6s' }}
                        className="block w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"
                      />
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    disabled={drawing}
                    onClick={startDraw}
                    className="btn-secondary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Shuffle size={14} />
                    Outro
                  </button>
                  <button
                    disabled={drawing}
                    onClick={() => setLuckyModal(false)}
                    className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Escolhido!
                  </button>
                </div>
              </div>
            )
          })()}

          {/* ── Botão sortear inicial (quando nenhum resultado ainda) ── */}
          {!drawing && !(displayItem ?? luckyItem) && (
            <button
              onClick={startDraw}
              disabled={buildPool(drawFilter).length === 0}
              className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Shuffle size={14} />
              Sortear!
            </button>
          )}
        </>
      </Modal>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  item: WatchlistItem
  index: number
  isOwner: boolean
  myReview: WatchlistReview | undefined
  partnerReview: WatchlistReview | undefined
  partnerName: string
  onDelete: () => void
  onMarkWatched: () => void
  onReview: () => void
}

function WatchlistCard({
  item, index, isOwner, myReview, partnerReview, partnerName,
  onDelete, onMarkWatched, onReview,
}: CardProps) {
  const [expanded, setExpanded] = useState(false)
  const [justWatched, setJustWatched] = useState(false)

  function handleMarkWatched() {
    setJustWatched(true)
    setTimeout(() => setJustWatched(false), 600)
    onMarkWatched()
  }

  const staggerClass = index < 10 ? `stagger-${index + 1}` : ''

  return (
    <div
      className={`card flex flex-col overflow-hidden animate-card-enter ${staggerClass} ${item.status === 'watched' ? 'opacity-90' : ''}`}
    >

      {/* Conteúdo principal */}
      <div className="flex gap-3 p-3.5">

        {/* Poster com proporção 2:3 fixa */}
        <div className="shrink-0 w-[68px] rounded-lg overflow-hidden bg-stone-100 self-stretch min-h-[102px]">
          {item.posterPath ? (
            <img
              src={`${POSTER_SM}${item.posterPath}`}
              alt={item.title}
              className="w-full h-full object-cover"
              style={{ minHeight: 102 }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ minHeight: 102 }}>
              <Popcorn size={20} className="text-stone-300" />
            </div>
          )}
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">

          {/* Tipo + status badge */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1">
              {item.mediaType === 'movie'
                ? <Film size={10} className="text-stone-400 shrink-0" />
                : <Tv2  size={10} className="text-stone-400 shrink-0" />}
              <span className="text-[10px] text-stone-400">
                {item.mediaType === 'movie' ? 'Filme' : 'Série'} · {item.releaseYear}
              </span>
            </div>

            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
              item.status === 'watched'
                ? 'bg-green-50 text-green-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              {item.status === 'watched'
                ? <><CheckCircle2 size={9} /> Assistido</>
                : <><Clock size={9} /> Pra assistir</>}
            </span>
          </div>

          {/* Título */}
          <p className="text-sm font-semibold text-stone-900 leading-snug line-clamp-2">{item.title}</p>

          {/* TMDB rating */}
          {item.tmdbRating > 0 && (
            <div className="flex items-center gap-1">
              <Star size={10} className="text-amber-400 fill-amber-400" />
              <span className="text-[10px] text-stone-500 font-semibold">{item.tmdbRating.toFixed(1)}</span>
              <span className="text-[10px] text-stone-400">TMDB</span>
            </div>
          )}

          {/* Gêneros */}
          {item.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.genres.slice(0, 2).map(g => (
                <span key={g} className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full">{g}</span>
              ))}
            </div>
          )}

          {/* Quem adicionou */}
          <p className="text-[10px] text-stone-400 mt-auto">
            por {isOwner ? 'você' : item.addedByName}
          </p>
        </div>
      </div>

      {/* Bloco de reviews resumido */}
      {(myReview || partnerReview) && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="px-3.5 py-2.5 border-t border-stone-100 flex items-center justify-between gap-2 text-xs text-stone-500 hover:bg-stone-50 active:bg-stone-100 transition-colors"
        >
          <div className="flex flex-col gap-1 items-start min-w-0">
            {myReview && (
              <span className="flex items-center gap-1.5">
                <span className="text-[10px] text-stone-400 shrink-0">Você</span>
                <StarRating value={myReview.rating} size={11} />
              </span>
            )}
            {partnerReview && (
              <span className="flex items-center gap-1.5">
                <span className="text-[10px] text-stone-400 truncate max-w-[60px]">
                  {partnerName || 'parceiro/a'}
                </span>
                <StarRating value={partnerReview.rating} size={11} />
              </span>
            )}
          </div>
          <ChevronDown
            size={13}
            className={`shrink-0 transition-transform text-stone-400 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* Comentários expandidos */}
      {expanded && (
        <div className="px-3.5 pt-2.5 pb-3 space-y-2.5 bg-stone-50/60 border-t border-stone-100">
          {myReview?.comment && (
            <div>
              <p className="text-[10px] font-semibold text-stone-500 mb-0.5">Você</p>
              <p className="text-xs text-stone-600 italic leading-relaxed">"{myReview.comment}"</p>
            </div>
          )}
          {partnerReview?.comment && (
            <div>
              <p className="text-[10px] font-semibold text-stone-500 mb-0.5">{partnerName || 'parceiro/a'}</p>
              <p className="text-xs text-stone-600 italic leading-relaxed">"{partnerReview.comment}"</p>
            </div>
          )}
        </div>
      )}

      {/* Ações — áreas de toque maiores em mobile */}
      <div className="flex items-center border-t border-stone-100">
        {item.status === 'to_watch' && (
          <button
            onClick={handleMarkWatched}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-stone-500 hover:text-green-700 hover:bg-green-50 active:bg-green-100 transition-colors"
          >
            <CheckCircle2
              size={13}
              className={justWatched ? 'animate-check-burst text-green-600' : ''}
            />
            Assistido
          </button>
        )}
        <button
          onClick={onReview}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-stone-500 hover:text-amber-600 hover:bg-amber-50 active:bg-amber-100 transition-colors ${
            item.status === 'to_watch' ? 'border-l border-stone-100' : ''
          }`}
        >
          <Star size={13} />
          Avaliar
        </button>
        <button
          onClick={onDelete}
          className="w-12 flex items-center justify-center py-3 text-stone-300 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors border-l border-stone-100"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Row resultado TMDB ───────────────────────────────────────────────────────

function TmdbResultRow({
  result, index, alreadyAdded, isLoading, onAdd,
}: {
  result: TmdbResult
  index: number
  alreadyAdded: boolean
  isLoading: boolean
  onAdd: () => void
}) {
  const staggerClass = index < 10 ? `stagger-${index + 1}` : ''
  return (
    <div className={`flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-stone-50 active:bg-stone-100 transition-colors animate-row-in ${staggerClass}`}>
      {/* Poster */}
      <div className="w-10 h-[60px] rounded-lg overflow-hidden bg-stone-100 shrink-0">
        {result.poster_path ? (
          <img
            src={`${POSTER_SM}${result.poster_path}`}
            alt={tmdbTitle(result)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Popcorn size={14} className="text-stone-300" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-900 leading-snug line-clamp-2">{tmdbTitle(result)}</p>
        <p className="text-xs text-stone-400 mt-0.5">
          {result.media_type === 'movie' ? 'Filme' : 'Série'} · {releaseYear(result)}
        </p>
        {result.vote_average > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <Star size={9} className="text-amber-400 fill-amber-400" />
            <span className="text-[10px] text-stone-500">{result.vote_average.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Botão */}
      <button
        onClick={onAdd}
        disabled={alreadyAdded || isLoading}
        className={`shrink-0 min-w-[72px] flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
          alreadyAdded
            ? 'border-stone-200 text-stone-400 bg-stone-50 cursor-not-allowed opacity-60'
            : 'border-stone-300 text-stone-700 bg-white hover:bg-stone-50 active:bg-stone-100'
        }`}
      >
        {isLoading ? (
          <div className="w-3 h-3 border border-stone-400 border-t-transparent rounded-full animate-spin" />
        ) : alreadyAdded ? (
          'Na lista'
        ) : (
          <><Plus size={11} /> Add</>
        )}
      </button>
    </div>
  )
}
