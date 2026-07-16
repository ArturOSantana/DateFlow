import { useEffect, useState } from 'react'
import {
  Users, UserPlus, UserCheck, UserX, Trash2, User, Clock, Check,
  Heart, MapPin, Utensils, X, ChevronDown,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import * as dbApi from '../lib/db'
import type { Partnership, PreferenceCategory } from '../types'

// ─── Modal de preferências da parceira ───────────────────────────────────────

function TagGroup({ items, color, label }: { items: string[]; color: string; label: string }) {
  if (items.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-xs text-stone-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{item}</span>
        ))}
      </div>
    </div>
  )
}

function PrefsModal({
  name,
  prefs,
  loading,
  onClose,
}: {
  name: string
  prefs: PreferenceCategory | null
  loading: boolean
  onClose: () => void
}) {
  const hasContent = prefs && (
    prefs.activitiesLoves.length > 0 ||
    prefs.placesLoves.length > 0 ||
    prefs.placesNever.length > 0 ||
    prefs.placesTolerate.length > 0 ||
    prefs.foodLoves.length > 0 ||
    prefs.foodNever.length > 0 ||
    prefs.foodTolerate.length > 0 ||
    prefs.otherNotes.trim().length > 0
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-rose-400" />
            <p className="text-sm font-semibold text-stone-900">Preferências de {name}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-5 py-4">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
            </div>
          )}

          {!loading && !hasContent && (
            <div className="text-center py-8">
              <Heart size={28} className="text-stone-200 mx-auto mb-2" />
              <p className="text-sm text-stone-500">{name} ainda não preencheu as preferências.</p>
              <p className="text-xs text-stone-400 mt-1">Quando ela preencher, você verá aqui.</p>
            </div>
          )}

          {!loading && hasContent && prefs && (
            <div className="space-y-4">
              {/* Atividades */}
              {prefs.activitiesLoves.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Heart size={11} className="text-rose-400" /> Atividades
                  </p>
                  <TagGroup items={prefs.activitiesLoves} color="bg-rose-50 text-rose-700 border border-rose-100" label="Adora fazer" />
                </div>
              )}

              {/* Lugares */}
              {(prefs.placesLoves.length > 0 || prefs.placesNever.length > 0 || prefs.placesTolerate.length > 0) && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <MapPin size={11} className="text-violet-400" /> Lugares
                  </p>
                  <div className="space-y-2">
                    <TagGroup items={prefs.placesLoves} color="bg-violet-50 text-violet-700 border border-violet-100" label="Adora ir" />
                    <TagGroup items={prefs.placesNever} color="bg-red-50 text-red-700 border border-red-100" label="Não vai de jeito nenhum" />
                    <TagGroup items={prefs.placesTolerate} color="bg-amber-50 text-amber-700 border border-amber-100" label="Não gosta mas vai" />
                  </div>
                </div>
              )}

              {/* Comida */}
              {(prefs.foodLoves.length > 0 || prefs.foodNever.length > 0 || prefs.foodTolerate.length > 0) && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Utensils size={11} className="text-emerald-500" /> Comida
                  </p>
                  <div className="space-y-2">
                    <TagGroup items={prefs.foodLoves} color="bg-emerald-50 text-emerald-700 border border-emerald-100" label="Adora comer" />
                    <TagGroup items={prefs.foodNever} color="bg-red-50 text-red-700 border border-red-100" label="Não come de jeito nenhum" />
                    <TagGroup items={prefs.foodTolerate} color="bg-amber-50 text-amber-700 border border-amber-100" label="Come com exceção" />
                  </div>
                </div>
              )}

              {/* Outros */}
              {prefs.otherNotes.trim() && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Outras observações</p>
                  <p className="text-sm text-stone-600 bg-stone-50 rounded-xl px-3 py-2.5 whitespace-pre-wrap">{prefs.otherNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PartnerPage() {
  const { user } = useAuth()
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Modal de preferências
  const [prefsModal, setPrefsModal] = useState<{ name: string; uid: string } | null>(null)
  const [loadingPrefs, setLoadingPrefs] = useState(false)
  const [viewedPrefs, setViewedPrefs] = useState<PreferenceCategory | null>(null)

  // Vinculação em massa
  const [linking, setLinking] = useState<string | null>(null) // uid da parceira sendo vinculada
  const [linkedMsg, setLinkedMsg] = useState<string | null>(null)

  async function load() {
    if (!user) return
    setLoading(true)
    const data = await dbApi.getMyPartnerships(user.uid, user.email ?? undefined)
    setPartnerships(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  async function linkAllDates(partnerUid: string, partnerName: string) {
    if (!user) return
    setLinking(partnerUid)
    setLinkedMsg(null)
    const count = await dbApi.linkPartnerToAllDates(user.uid, partnerUid)
    setLinking(null)
    setLinkedMsg(
      count > 0
        ? `${count} date${count > 1 ? 's' : ''} vinculado${count > 1 ? 's' : ''} a ${partnerName}!`
        : `Todos os seus dates já estavam vinculados a ${partnerName}.`,
    )
    setTimeout(() => setLinkedMsg(null), 4000)
  }

  async function openPrefs(name: string, uid: string) {
    setPrefsModal({ name, uid })
    setViewedPrefs(null)
    setLoadingPrefs(true)
    const prefs = await dbApi.getUserPreferences(uid)
    setViewedPrefs(prefs)
    setLoadingPrefs(false)
  }

  /** Envia convite */
  async function sendInvite() {
    if (!user) return
    const email = inviteEmail.trim().toLowerCase()
    if (!email.includes('@')) {
      setError('Digite um e-mail válido.')
      return
    }
    if (email === user.email?.toLowerCase()) {
      setError('Você não pode convidar a si mesmo.')
      return
    }

    // Limite: só pode ter uma parceira por vez (aceita ou convite pendente enviado)
    const hasActivePartner = partnerships.some(
      p => p.requesterId === user.uid && (p.status === 'accepted' || p.status === 'pending'),
    )
    if (hasActivePartner) {
      setError('Você já tem uma parceira ativa. Remova a parceria atual antes de convidar outra pessoa.')
      return
    }

    const alreadyExists = partnerships.some(
      p => p.requesterEmail === user.email?.toLowerCase()
        && p.recipientEmail === email,
    )
    if (alreadyExists) {
      setError('Você já enviou um convite para esse e-mail.')
      return
    }

    setSending(true)
    setError(null)
    try {
      await dbApi.createPartnership({
        requesterId: user.uid,
        requesterEmail: user.email!.toLowerCase(),
        requesterName: user.displayName ?? 'Usuário',
        requesterPhoto: user.photoURL ?? null,
        recipientId: '',
        recipientEmail: email,
        recipientName: '',
        recipientPhoto: null,
        status: 'pending',
      })
      setInviteEmail('')
      setSuccess('Convite enviado! Quando ela abrir o app e clicar em "Parceira" na navegação, verá a solicitação para aceitar.')
      await load()
    } catch (err) {
      console.error('[PartnerPage] sendInvite error:', err)
      setError('Erro ao enviar convite. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  async function acceptInvite(p: Partnership) {
    if (!user) return
    await dbApi.updatePartnership(p.id, {
      status: 'accepted',
      recipientId: user.uid,
      recipientName: user.displayName ?? 'Usuária',
      recipientPhoto: user.photoURL ?? null,
    })
    await load()
  }

  async function rejectInvite(p: Partnership) {
    if (!user) return
    await dbApi.updatePartnership(p.id, { status: 'rejected' })
    await load()
  }

  async function removePartnership(id: string) {
    if (!window.confirm('Deseja remover essa parceria?')) return
    await dbApi.deletePartnership(id)
    await load()
  }

  if (!user) return null

  const pendingReceived = partnerships.filter(
    p => p.recipientEmail === user.email?.toLowerCase() && p.status === 'pending',
  )
  const pendingSent = partnerships.filter(
    p => p.requesterId === user.uid && p.status === 'pending',
  )
  const accepted = partnerships.filter(p => p.status === 'accepted')

  // Bloqueia o formulário de convite quando já há parceria ativa (aceita ou pendente enviada)
  const hasActivePartner = accepted.length > 0 || pendingSent.length > 0

  return (
    <div className="p-5 md:p-7 max-w-lg">
      <div className="flex items-center gap-2 mb-1">
        <Users size={16} className="text-stone-500" />
        <h1 className="text-base font-semibold text-stone-900">Acesso compartilhado</h1>
      </div>
      <p className="text-sm text-stone-500 mb-6">
        Pessoa com acesso podem ver seus dates e adicionar observações.
      </p>

      {/* ── Enviar convite — oculto quando já há parceira ativa ── */}
      {!hasActivePartner && (
        <div className="card p-4 mb-5">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Convidar parceira</p>
          <p className="text-sm text-stone-600 mb-3">
            Digite o e-mail de quem vai receber acesso aos seus dates.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              className="input flex-1 text-sm"
              placeholder="email@exemplo.com"
              value={inviteEmail}
              onChange={e => { setInviteEmail(e.target.value); setError(null); setSuccess(null) }}
              onKeyDown={e => e.key === 'Enter' && sendInvite()}
            />
            <button
              onClick={sendInvite}
              disabled={sending}
              className="btn-primary shrink-0"
            >
              <UserPlus size={14} />
              {sending ? 'Enviando…' : 'Dar acesso'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          {success && <p className="text-xs text-emerald-600 mt-2">{success}</p>}
        </div>
      )}

      {/* ── Convites recebidos ── */}
      {pendingReceived.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Solicitações recebidas</p>
          <div className="space-y-2">
            {pendingReceived.map(p => (
              <div key={p.id} className="card p-4 flex items-center gap-3">
                {p.requesterPhoto
                  ? <img src={p.requesterPhoto} alt="" className="w-10 h-10 rounded-full shrink-0" />
                  : <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center shrink-0"><User size={18} className="text-stone-500" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{p.requesterName || p.requesterEmail}</p>
                  <p className="text-xs text-stone-500 truncate">{p.requesterEmail}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => acceptInvite(p)}
                    className="btn-secondary text-xs px-2 py-1 text-emerald-700 border-emerald-200"
                    title="Aceitar"
                  >
                    <Check size={13} />
                    Aceitar
                  </button>
                  <button
                    onClick={() => rejectInvite(p)}
                    className="btn-ghost text-xs px-2 py-1 text-red-500"
                    title="Recusar"
                  >
                    <UserX size={13} />
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Convites enviados aguardando ── */}
      {pendingSent.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Aguardando resposta</p>
          <div className="space-y-2">
            {pendingSent.map(p => (
              <div key={p.id} className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-stone-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-700 truncate">{p.recipientEmail}</p>
                  <p className="text-xs text-stone-400">Pendente</p>
                </div>
                <button
                  onClick={() => removePartnership(p.id)}
                  className="btn-ghost text-xs text-stone-400 hover:text-red-500 shrink-0"
                  title="Cancelar convite"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Acessos ativos ── */}
      {!loading && accepted.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Com acesso</p>
          <div className="space-y-2">
            {accepted.map(p => {
              const isMe = p.requesterId === user.uid
              const partnerName  = isMe ? p.recipientName  : p.requesterName
              const partnerEmail = isMe ? p.recipientEmail : p.requesterEmail
              const partnerPhoto = isMe ? p.recipientPhoto : p.requesterPhoto
              const partnerId    = isMe ? p.recipientId    : p.requesterId
              return (
                <div key={p.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    {partnerPhoto
                      ? <img src={partnerPhoto} alt="" className="w-10 h-10 rounded-full shrink-0" />
                      : <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center shrink-0"><User size={18} className="text-stone-500" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{partnerName || partnerEmail}</p>
                      <p className="text-xs text-stone-500 truncate">{partnerEmail}</p>
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 mt-0.5">
                        <UserCheck size={11} />
                        Acesso ativo
                      </span>
                    </div>
                    <button
                      onClick={() => removePartnership(p.id)}
                      className="btn-ghost text-stone-400 hover:text-red-500 shrink-0"
                      title="Remover parceria"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Ações do card */}
                  {partnerId && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-stone-100">
                      <div className="flex gap-2">
                        <a
                          href={`/partner/view/${partnerId}`}
                          className="btn-secondary text-xs flex-1 justify-center"
                        >
                          <ChevronDown size={13} />
                          Ver dates dela
                        </a>
                        <button
                          onClick={() => openPrefs(partnerName || partnerEmail, partnerId)}
                          className="btn-secondary text-xs flex-1 justify-center"
                        >
                          <Heart size={13} className="text-rose-400" />
                          Ver preferências
                        </button>
                      </div>
                      <button
                        onClick={() => linkAllDates(partnerId, partnerName || partnerEmail)}
                        disabled={linking === partnerId}
                        className="btn-secondary text-xs w-full justify-center text-violet-700 border-violet-200 hover:bg-violet-50"
                      >
                        {linking === partnerId
                          ? 'Vinculando…'
                          : 'Compartilhar todos os meus dates com ela'
                        }
                      </button>
                      {linkedMsg && <p className="text-xs text-emerald-600 text-center">{linkedMsg}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {!loading && partnerships.length === 0 && (
        <div className="text-center py-10">
          <Users size={32} className="text-stone-200 mx-auto mb-3" />
          <p className="text-sm text-stone-500">Ninguém com acesso ainda.</p>
          <p className="text-xs text-stone-400 mt-1">Use o campo acima para convidar alguém.</p>
        </div>
      )}

      {/* ── Modal de preferências ── */}
      {prefsModal && (
        <PrefsModal
          name={prefsModal.name}
          prefs={viewedPrefs}
          loading={loadingPrefs}
          onClose={() => { setPrefsModal(null); setViewedPrefs(null) }}
        />
      )}
    </div>
  )
}
