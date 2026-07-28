import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { requestPushPermission } from '../lib/pushNotifications'

interface Props {
  userId: string
  /** Chamado quando o fluxo termina. `granted=true` se o usuário clicou em Ativar. */
  onDone: (granted?: boolean) => void
}

/**
 * Banner que solicita permissão de notificação ao usuário.
 * Só aparece quando a permissão ainda não foi concedida ou negada.
 * A solicitação real só ocorre ao clicar em "Ativar" — exigência dos navegadores.
 */
export default function NotificationPrompt({ userId, onDone }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleAllow() {
    setLoading(true)
    const ok = await requestPushPermission(userId)
    setLoading(false)
    onDone(ok)
  }

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] md:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(380px,calc(100vw-1.5rem))] animate-modal-slide-up">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-lg px-4 py-3.5 flex items-start gap-3">
        {/* Ícone */}
        <div className="w-9 h-9 rounded-full bg-[#F8F0ED] flex items-center justify-center shrink-0 mt-0.5">
          <Bell size={16} className="text-[#9f4b38]" />
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-900 leading-snug">
            Ativar notificações
          </p>
          <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
            Receba avisos quando seu parceiro aceitar, alterar ou criar um date.
          </p>

          {/* Ações */}
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={handleAllow}
              disabled={loading}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {loading ? 'Aguarde…' : 'Ativar'}
            </button>
            <button
              onClick={() => onDone(false)}
              className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1.5 transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>

        {/* Fechar */}
        <button
          onClick={() => onDone(false)}
          className="text-stone-300 hover:text-stone-500 transition-colors shrink-0 mt-0.5"
          aria-label="Fechar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
