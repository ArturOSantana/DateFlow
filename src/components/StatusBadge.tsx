
import type { DateStatus } from '../types'

const labels: Record<DateStatus, string> = {
  waiting_courage: 'Aguardando Coragem',
  waiting_money:   'Aguardando Dinheiro',
  waiting_reply:   'Aguardando Resposta',
  confirmed:       'Confirmado',
  cancelled:       'Cancelado',
  done:            'Realizado',
}

const classes: Record<DateStatus, string> = {
  waiting_courage: 'status-waiting-courage',
  waiting_money:   'status-waiting-money',
  waiting_reply:   'status-waiting-reply',
  confirmed:       'status-confirmed',
  cancelled:       'status-cancelled',
  done:            'status-done',
}

const dots: Record<DateStatus, string> = {
  waiting_courage: 'bg-rose-400',
  waiting_money:   'bg-amber-400',
  waiting_reply:   'bg-sky-400',
  confirmed:       'bg-emerald-500',
  cancelled:       'bg-stone-400',
  done:            'bg-violet-500',
}

export default function StatusBadge({ status }: { status: DateStatus }) {
  return (
    <span className={classes[status]}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {labels[status]}
    </span>
  )
}
