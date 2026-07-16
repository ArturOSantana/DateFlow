
import { Heart } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signInWithGoogle, loading } = useAuth()

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      {/* Fundo decorativo sutil */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-ember-100 rounded-full opacity-40" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-rose-100 rounded-full opacity-30" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-ember-600 rounded-3xl mb-5 shadow-lg shadow-ember-600/30">
            <Heart size={26} className="text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">DateFlow</h1>
          <p className="text-sm text-stone-500 mt-1.5">Planeje os encontros que importam.</p>
        </div>

        {/* Card de login */}
        <div className="card p-6">
          <p className="text-xs text-stone-500 text-center mb-5">
            Entre com sua conta Google para começar
          </p>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 active:scale-[.98] transition-all disabled:opacity-50 shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            {loading ? 'Entrando…' : 'Continuar com Google'}
          </button>
        </div>

        <p className="text-center text-xs text-stone-400 mt-5">
          Seus dados ficam salvos na sua conta Google.
        </p>
      </div>
    </div>
  )
}
