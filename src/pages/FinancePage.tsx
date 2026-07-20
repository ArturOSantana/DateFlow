import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, TrendingUp, TrendingDown, ArrowRight, DollarSign,
  CheckCircle2, Circle, Star,
} from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { formatDate } from '../lib/utils'
import EmptyState from '../components/EmptyState'

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function FinancePage() {
  const { dates } = useApp()
  const navigate = useNavigate()

  const withFinance = useMemo(
    () => dates.filter(d => d.budget != null || d.actualCost != null),
    [dates],
  )

  const stats = useMemo(() => {
    const totalBudget = withFinance.reduce((s, d) => s + (d.budget ?? 0), 0)
    const totalSpent  = withFinance.reduce((s, d) => s + (d.actualCost ?? 0), 0)
    const overBudget  = withFinance.filter(
      d => d.budget != null && d.actualCost != null && d.actualCost > d.budget,
    ).length
    return { totalBudget, totalSpent, overBudget }
  }, [withFinance])

  const diff = stats.totalSpent - stats.totalBudget
  const over = diff > 0
  const pct  = stats.totalBudget > 0
    ? Math.min((stats.totalSpent / stats.totalBudget) * 100, 100)
    : 0

  return (
    <div className="p-5 md:p-7 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-900">Finanças</h1>
        <p className="text-sm text-stone-400 mt-0.5">Orçamento e gastos dos seus dates</p>
      </div>

      {withFinance.length === 0 ? (
        <EmptyState
          icon={<Wallet size={36} />}
          title="Nenhum dado financeiro"
          description="Adicione orçamento ou gasto real nos seus dates para acompanhar aqui."
        />
      ) : (
        <>
          {/* Stats em grid */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="card p-3 animate-pop-in stagger-1">
              <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center mb-1.5">
                <DollarSign size={13} className="text-stone-500" />
              </div>
              <p className="text-[10px] text-stone-400 mb-0.5 leading-tight">Orçamento</p>
              <p className="text-sm font-bold text-stone-900 leading-tight tabular-nums truncate">
                {fmt(stats.totalBudget)}
              </p>
            </div>

            <div className="card p-3 animate-pop-in stagger-2">
              <div className="w-7 h-7 rounded-lg bg-ember-50 flex items-center justify-center mb-1.5">
                <Wallet size={13} className="text-ember-600" />
              </div>
              <p className="text-[10px] text-stone-400 mb-0.5 leading-tight">Gasto</p>
              <p className="text-sm font-bold text-stone-900 leading-tight tabular-nums truncate">
                {fmt(stats.totalSpent)}
              </p>
            </div>

            <div className={`card p-3 animate-pop-in stagger-3 ${over ? 'border-red-200' : 'border-emerald-200'}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${over ? 'bg-red-50' : 'bg-emerald-50'}`}>
                {over
                  ? <TrendingUp size={13} className="text-red-500" />
                  : <TrendingDown size={13} className="text-emerald-600" />
                }
              </div>
              <p className="text-[10px] text-stone-400 mb-0.5 leading-tight">Saldo</p>
              <p className={`text-sm font-bold leading-tight tabular-nums truncate ${over ? 'text-red-600' : 'text-emerald-700'}`}>
                {over ? '+' : ''}{fmt(diff)}
              </p>
            </div>
          </div>

          {/* Barra de aproveitamento */}
          {stats.totalBudget > 0 && (
            <div className="card px-5 py-4 mb-6 animate-slide-up">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-semibold text-stone-600">Aproveitamento do orçamento</p>
                <span className={`text-xs font-bold tabular-nums ${over ? 'text-red-500' : 'text-emerald-600'}`}>
                  {Math.round((stats.totalSpent / stats.totalBudget) * 100)}%
                </span>
              </div>
              <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-2.5 rounded-full animate-bar-grow ${over ? 'bg-red-400' : 'bg-emerald-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-stone-400">
                <span>R$ 0</span>
                <span>{fmt(stats.totalBudget)}</span>
              </div>
            </div>
          )}

          {/* Lista */}
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Por date</p>
          <div className="space-y-2">
            {withFinance.map((d, i) => {
              const isOver   = d.budget != null && d.actualCost != null && d.actualCost > d.budget
              const hasBoth  = d.budget != null && d.actualCost != null
              const itemPct  = hasBoth ? Math.min((d.actualCost! / d.budget!) * 100, 100) : 0

              return (
                <button
                  key={d.id}
                  onClick={() => navigate(`/dates/${d.id}`)}
                  className="card w-full text-left px-4 py-3.5 hover:border-stone-300 hover:shadow-md hover:shadow-stone-900/[.06] transition-all active:scale-[.99] animate-slide-up"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-stone-900 truncate">{d.title}</p>
                        {d.status === 'done' && d.rating != null && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-500 shrink-0">
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            {d.rating}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400">{formatDate(d.date)} · {d.time}</p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        {d.actualCost != null && (
                          <p className={`text-sm font-bold tabular-nums ${isOver ? 'text-red-600' : 'text-stone-800'}`}>
                            {fmt(d.actualCost)}
                          </p>
                        )}
                        {d.budget != null && (
                          <p className="text-xs text-stone-400 tabular-nums">orç. {fmt(d.budget)}</p>
                        )}
                      </div>
                      <ArrowRight size={13} className="text-stone-300 shrink-0" />
                    </div>
                  </div>

                  {hasBoth && (
                    <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-1 rounded-full transition-all ${isOver ? 'bg-red-400' : 'bg-emerald-500'}`}
                        style={{ width: `${itemPct}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    {d.status === 'done'
                      ? <span className="inline-flex items-center gap-1 text-xs text-violet-600 font-medium"><CheckCircle2 size={11} />Realizado</span>
                      : d.status === 'cancelled'
                      ? <span className="inline-flex items-center gap-1 text-xs text-stone-400"><Circle size={11} />Cancelado</span>
                      : <span className="inline-flex items-center gap-1 text-xs text-stone-400"><DollarSign size={11} />Planejado</span>
                    }
                    {isOver && (
                      <span className="text-xs text-red-500 font-semibold">
                        +{fmt(d.actualCost! - d.budget!)} acima
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
