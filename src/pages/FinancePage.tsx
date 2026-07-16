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

  // Apenas dates que têm pelo menos um valor financeiro preenchido
  const withFinance = useMemo(
    () => dates.filter(d => d.budget != null || d.actualCost != null),
    [dates],
  )

  const stats = useMemo(() => {
    const totalBudget = withFinance.reduce((s, d) => s + (d.budget ?? 0), 0)
    const totalSpent  = withFinance.reduce((s, d) => s + (d.actualCost ?? 0), 0)
    const doneSpent   = dates
      .filter(d => d.status === 'done' && d.actualCost != null)
      .reduce((s, d) => s + (d.actualCost ?? 0), 0)
    const overBudget  = withFinance.filter(
      d => d.budget != null && d.actualCost != null && d.actualCost > d.budget,
    ).length
    return { totalBudget, totalSpent, doneSpent, overBudget }
  }, [withFinance, dates])

  const diff = stats.totalSpent - stats.totalBudget
  const overBudgetAll = diff > 0

  return (
    <div className="p-5 md:p-7 max-w-2xl">
      <h1 className="text-base font-semibold text-stone-900 mb-1">Controle financeiro</h1>
      <p className="text-xs text-stone-400 mb-5">
        Resumo de orçamento e gastos dos seus dates
      </p>

      {withFinance.length === 0 ? (
        <EmptyState
          icon={<Wallet size={36} />}
          title="Nenhum dado financeiro"
          description="Adicione orçamento ou gasto real nos seus dates para acompanhar aqui."
        />
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
            <div className="card p-4">
              <p className="text-xs text-stone-400 mb-1">Orçamento total</p>
              <p className="text-lg font-semibold text-stone-900 leading-tight">
                {fmt(stats.totalBudget)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-stone-400 mb-1">Total gasto</p>
              <p className="text-lg font-semibold text-stone-900 leading-tight">
                {fmt(stats.totalSpent)}
              </p>
            </div>
            <div className={`card p-4 ${overBudgetAll ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <p className="text-xs text-stone-400 mb-1">Diferença</p>
              <p className={`text-lg font-semibold leading-tight flex items-center gap-1 ${overBudgetAll ? 'text-red-600' : 'text-emerald-700'}`}>
                {overBudgetAll
                  ? <TrendingUp size={15} />
                  : <TrendingDown size={15} />
                }
                {overBudgetAll ? '+' : ''}{fmt(diff)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-stone-400 mb-1">Estourou orçamento</p>
              <p className="text-lg font-semibold text-stone-900 leading-tight">
                {stats.overBudget}
                <span className="text-xs text-stone-400 ml-1">dates</span>
              </p>
            </div>
          </div>

          {/* Barra de progresso orçamento x gasto */}
          {stats.totalBudget > 0 && (
            <div className="card px-4 py-3 mb-6">
              <div className="flex items-center justify-between mb-2 text-xs text-stone-500">
                <span>Aproveitamento do orçamento</span>
                <span>{Math.min(Math.round((stats.totalSpent / stats.totalBudget) * 100), 999)}%</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${overBudgetAll ? 'bg-red-400' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min((stats.totalSpent / stats.totalBudget) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-stone-400">
                <span>R$ 0</span>
                <span>{fmt(stats.totalBudget)}</span>
              </div>
            </div>
          )}

          {/* Lista de dates */}
          <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
            Por date
          </h2>
          <div className="space-y-2">
            {withFinance.map(d => {
              const over = d.budget != null && d.actualCost != null && d.actualCost > d.budget
              const hasBoth = d.budget != null && d.actualCost != null

              return (
                <button
                  key={d.id}
                  onClick={() => navigate(`/dates/${d.id}`)}
                  className="card w-full text-left px-4 py-3 hover:border-stone-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Título + meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-stone-900 truncate">{d.title}</p>
                        {d.status === 'done' && d.rating != null && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-500 shrink-0">
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            {d.rating}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400">{formatDate(d.date)} · {d.time}</p>
                    </div>

                    {/* Valores */}
                    <div className="text-right shrink-0">
                      {d.actualCost != null && (
                        <p className={`text-sm font-semibold ${over ? 'text-red-600' : 'text-stone-800'}`}>
                          {fmt(d.actualCost)}
                        </p>
                      )}
                      {d.budget != null && (
                        <p className="text-xs text-stone-400">orç. {fmt(d.budget)}</p>
                      )}
                    </div>

                    <ArrowRight size={13} className="text-stone-300 shrink-0 mt-0.5" />
                  </div>

                  {/* Mini barra por date */}
                  {hasBoth && (
                    <div className="mt-2.5">
                      <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-1 rounded-full ${over ? 'bg-red-400' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min((d.actualCost! / d.budget!) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Status badges inline */}
                  <div className="mt-2 flex items-center gap-2">
                    {d.status === 'done'
                      ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 size={11} />Realizado</span>
                      : d.status === 'cancelled'
                      ? <span className="inline-flex items-center gap-1 text-xs text-stone-400"><Circle size={11} />Cancelado</span>
                      : <span className="inline-flex items-center gap-1 text-xs text-stone-400"><DollarSign size={11} />Planejado</span>
                    }
                    {over && (
                      <span className="text-xs text-red-500 font-medium">
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
