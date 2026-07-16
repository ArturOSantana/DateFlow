import { useEffect, useState } from 'react'
import { Users, UserPlus, UserCheck, UserX, Trash2, User, Clock, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import * as dbApi from '../lib/db'
import type { Partnership } from '../types'

export default function PartnerPage() {
  const { user } = useAuth()
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function load() {
    if (!user) return
    setLoading(true)
    const data = await dbApi.getMyPartnerships(user.uid)
    setPartnerships(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  /** Envia convite: cria registro pending com o email digitado.
   *  Quando a destinatária fizer login e acessar /partner, verá o convite pendente
   *  pelo próprio email — sem precisar buscar por UID.
   */
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

    // Verifica duplicata nos dados já carregados — sem query extra ao Firestore
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
      setSuccess('Convite enviado! Quando ela abrir o app, verá a solicitação em Perfil → Acesso compartilhado.')
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

  /** Convites pendentes que a usuária recebeu (pelo e-mail) e ainda não aceitou */
  const pendingReceived = partnerships.filter(
    p => p.recipientEmail === user.email?.toLowerCase() && p.status === 'pending',
  )
  /** Convites que o usuário enviou e ainda estão pending */
  const pendingSent = partnerships.filter(
    p => p.requesterId === user.uid && p.status === 'pending',
  )
  /** Parcerias aceitas */
  const accepted = partnerships.filter(p => p.status === 'accepted')

  return (
    <div className="p-5 md:p-7 max-w-lg">
      <div className="flex items-center gap-2 mb-1">
        <Users size={16} className="text-stone-500" />
        <h1 className="text-base font-semibold text-stone-900">Acesso compartilhado</h1>
      </div>
      <p className="text-sm text-stone-500 mb-6">
        Pessoa com acesso podem ver seus dates e adicionar observações.
      </p>

      {/* ── Enviar convite ── */}
      <div className="card p-4 mb-5">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">Convidar pessoa</p>
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
                <div key={p.id} className="card p-4 flex items-center gap-3">
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
                  {partnerId && (
                    <a
                      href={`/partner/view/${partnerId}`}
                      className="btn-secondary text-xs shrink-0"
                    >
                      Ver dates
                    </a>
                  )}
                  <button
                    onClick={() => removePartnership(p.id)}
                    className="btn-ghost text-stone-400 hover:text-red-500 shrink-0"
                    title="Remover parceria"
                  >
                    <Trash2 size={13} />
                  </button>
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
    </div>
  )
}
