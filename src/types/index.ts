export type DateStatus =
  | 'waiting_courage'
  | 'waiting_money'
  | 'waiting_reply'
  | 'confirmed'
  | 'cancelled'
  | 'done'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface ExpenseItem {
  id: string
  label: string
  amount: number
}

export interface DateEvent {
  id: string
  userId: string
  title: string
  date: string       // ISO yyyy-MM-dd
  time: string       // HH:mm
  location: string
  description: string
  status: DateStatus
  checklist: ChecklistItem[]
  tags: string[]
  shareToken?: string
  /** Orçamento planejado (R$) */
  budget?: number
  /** Custo real gasto (R$) */
  actualCost?: number
  /** Itens de gasto registrados durante o date */
  expenses?: ExpenseItem[]
  /** Exibir valor gasto no link público (default: false) */
  shareFinance?: boolean
  /** Avaliação de 1 a 5 estrelas (preenchida quando status === 'done') */
  rating?: number
  /** Comentário/review do date */
  review?: string
  createdAt: number
  updatedAt: number
}

export interface Idea {
  id: string
  userId: string
  name: string
  category: string
  notes: string
  estimatedPrice: string
  favorite: boolean
  createdAt: number
}

export const IDEA_CATEGORIES = [
  'Restaurante',
  'Cinema',
  'Café',
  'Viagem',
  'Parque',
  'Show',
  'Museu',
  'Praia',
  'Outro',
] as const
