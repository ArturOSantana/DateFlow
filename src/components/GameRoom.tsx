import { useState } from 'react'
import { Copy, CheckCheck, Share2, Users } from 'lucide-react'

// ─── SetupRoom ────────────────────────────────────────────────────────────────

interface SetupRoomProps {
  title: string
  accentColor: string
  icon: React.ReactNode
  loading: boolean
  error: string
  onCreateRoom: (name: string) => void
  onJoinRoom: (name: string, code: string) => void
  initialCode?: string
}

export function SetupRoom({ title, accentColor, icon, loading, error, onCreateRoom, onJoinRoom, initialCode }: SetupRoomProps) {
  const [tab, setTab] = useState<'create' | 'join'>(initialCode ? 'join' : 'create')
  const [name, setName] = useState('')
  const [code, setCode] = useState(initialCode ?? '')

  return (
    <div className="max-w-sm mx-auto p-5 flex flex-col gap-5">
      <div className="text-center pt-2">
        <div className={`w-16 h-16 rounded-2xl ${accentColor} flex items-center justify-center mx-auto mb-4`}>
          {icon}
        </div>
        <h1 className="text-xl font-bold text-stone-900">{title}</h1>
        <p className="text-sm text-stone-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
          Cada um no próprio celular. Crie uma sala ou entre com o código.
        </p>
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
            {t === 'create' ? 'Criar sala' : 'Entrar com código'}
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
            <label className="label">Código da sala</label>
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

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}

      <button
        onClick={() => {
          if (!name.trim()) return
          if (tab === 'create') onCreateRoom(name.trim())
          else if (code.length === 4) onJoinRoom(name.trim(), code)
        }}
        disabled={loading || !name.trim() || (tab === 'join' && code.length < 4)}
        className="btn-primary justify-center py-3.5 text-base rounded-xl disabled:opacity-40"
      >
        <Users size={16} />
        {loading ? 'Aguarde...' : tab === 'create' ? 'Criar sala' : 'Entrar na sala'}
      </button>
    </div>
  )
}

// ─── WaitingRoom ──────────────────────────────────────────────────────────────

interface WaitingRoomProps {
  code: string
  gamePath: string
  onCancel: () => void
}

export function WaitingRoom({ code, gamePath, onCancel }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}${gamePath}?code=${code}`

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function shareLink() {
    if (navigator.share) {
      navigator.share({ title: 'Vem jogar comigo!', url: link })
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
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Sala criada</p>
        <p className="text-sm text-stone-600 mt-2">Mande o link ou o código para ela entrar:</p>
        <p className="text-5xl font-bold tracking-[0.25em] text-stone-900 mt-3 font-mono">{code}</p>
        <p className="text-xs text-stone-400 mt-3">Aguardando ela entrar…</p>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={shareLink} className="btn-primary flex-1 justify-center">
          <Share2 size={14} />
          Enviar link
        </button>
        <button onClick={copyLink} className="btn-secondary flex-1 justify-center">
          {copied ? <CheckCheck size={14} className="text-emerald-600" /> : <Copy size={14} />}
          {copied ? 'Copiado!' : 'Copiar link'}
        </button>
      </div>
      <button
        onClick={onCancel}
        className="text-xs text-stone-400 hover:text-red-500 transition-colors underline underline-offset-2"
      >
        Cancelar sala
      </button>
    </div>
  )
}
