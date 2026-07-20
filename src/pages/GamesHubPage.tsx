import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Flame, HelpCircle, MessageSquare, MousePointerClick, Mic, Layers, Wine, X, Users, Wifi } from 'lucide-react'

// presentialOnly: true = só presencial | false = presencial ou remoto
const GAMES = [
  {
    id: 'brasa',
    path: '/ideas/brasa',
    icon: Flame,
    iconColor: 'text-orange-500',
    iconBg: 'bg-orange-100',
    border: 'border-orange-200 bg-orange-50/40',
    name: 'Brasa',
    tag: 'JOGO 1',
    desc: 'Cartas de conexão a dois — votem, revelem, se descubram.',
    time: '20–40 min',
    presentialOnly: false,
  },
  {
    id: 'verdades',
    path: '/ideas/games/verdades',
    icon: HelpCircle,
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-100',
    border: 'border-violet-200',
    name: '2 Verdades, 1 Mentira',
    tag: 'JOGO 2',
    desc: '2 verdades + 1 mentira. Adivinha qual é a falsa em 30 s.',
    time: '5–10 min',
    presentialOnly: false,
  },
  {
    id: 'frase',
    path: '/ideas/games/frase',
    icon: MessageSquare,
    iconColor: 'text-sky-600',
    iconBg: 'bg-sky-100',
    border: 'border-sky-200',
    name: 'Complete a Frase',
    tag: 'JOGO 3',
    desc: 'Complete frases ao mesmo tempo. Votem na mais corajosa.',
    time: '5–10 min',
    presentialOnly: false,
  },
  {
    id: 'nuncafiz',
    path: '/ideas/games/nuncafiz',
    icon: MousePointerClick,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    border: 'border-emerald-200',
    name: 'Nunca Fiz, Mas Faria',
    tag: 'JOGO 4',
    desc: 'Atividades: Nunca Fiz / Já Fiz / Faria. Compare as respostas.',
    time: '3–8 min',
    presentialOnly: false,
  },
  {
    id: 'audio',
    path: '/ideas/games/audio',
    icon: Mic,
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-100',
    border: 'border-rose-200',
    name: 'Adivinhe o Áudio',
    tag: 'JOGO 5',
    desc: 'Grave 10 s imitando algo. O outro adivinha ao vivo.',
    time: '5–15 min',
    presentialOnly: true,
  },
  {
    id: 'estaouaquela',
    path: '/ideas/games/estaouaquela',
    icon: Layers,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    border: 'border-amber-200',
    name: 'Esta ou Aquela?',
    tag: 'JOGO 6',
    desc: 'Escolha entre dois cenários e tente convencer o outro.',
    time: '5–10 min',
    presentialOnly: false,
  },
  {
    id: 'drink',
    path: '/ideas/games/drink',
    icon: Wine,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
    border: 'border-red-200',
    name: 'Drink Game — Roleta',
    tag: 'BÔNUS',
    desc: 'Roleta de desafios. Quem perde, bebe ou faz o desafio.',
    time: 'Livre',
    presentialOnly: true,
  },
  {
    id: 'eununca',
    path: '/ideas/games/eununca',
    icon: X,
    iconColor: 'text-stone-600',
    iconBg: 'bg-stone-100',
    border: 'border-stone-200',
    name: 'Eu Nunca',
    tag: 'BÔNUS',
    desc: 'Frases geradas ou escritas por vocês. Quem fez, bebe.',
    time: 'Livre',
    presentialOnly: true,
  },
]

export default function GamesHubPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-full">
      {/* Topbar */}
      <div className="px-4 pt-5 pb-3 md:px-7 md:pt-6 border-b border-stone-100 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/ideas')}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-stone-100 transition-colors shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-stone-900">Jogos a Dois</h1>
            <p className="text-xs text-stone-400 mt-0.5">Escolha um dos 9 jogos para jogar a dois</p>
          </div>
        </div>
      </div>

      {/* Grid de jogos */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 md:px-7 md:pt-7 md:pb-7">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
          {GAMES.map(g => {
            const Icon = g.icon
            return (
              <button
                key={g.id}
                onClick={() => navigate(g.path)}
                className={`card p-4 flex items-start gap-3 hover:shadow-sm transition-all text-left border ${g.border}`}
              >
                <div className={`w-10 h-10 rounded-xl ${g.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon size={18} className={g.iconColor} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">{g.tag}</span>
                    <span className="text-[10px] text-stone-300">·</span>
                    <span className="text-[10px] text-stone-400">{g.time}</span>
                  </div>
                  <p className="text-sm font-semibold text-stone-900 leading-snug mt-0.5">{g.name}</p>
                  <p className="text-xs text-stone-500 leading-relaxed mt-0.5">{g.desc}</p>
                  {/* Badge de modo */}
                  <div className="mt-1.5 flex items-center gap-1">
                    {g.presentialOnly ? (
                      <>
                        <Users size={10} className="text-amber-600 shrink-0" />
                        <span className="text-[10px] font-semibold text-amber-600">Somente presencial</span>
                      </>
                    ) : (
                      <>
                        <Wifi size={10} className="text-emerald-600 shrink-0" />
                        <span className="text-[10px] font-semibold text-emerald-600">Presencial ou remoto</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
