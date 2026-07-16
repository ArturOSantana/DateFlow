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
  /**
   * UID de quem vai participar do date (a outra pessoa com acesso).
   * Só aparecem para ela os dates onde withPartnerId === seu UID.
   */
  withPartnerId?: string
  /** Observações adicionadas pela parceira no link de parceira */
  partnerNote?: string
  /**
   * Quando true, os detalhes do date ficam ocultos para a parceira.
   * Ela só vê as dicas (partnerHints). As dicas são obrigatórias se oculto.
   */
  hiddenFromPartner?: boolean
  /** Dicas sobre o date que o criador deixa para a parceira */
  partnerHints?: string[]
  /** Resposta da parceira ao date: 'accepted' | 'declined' */
  partnerDecision?: 'accepted' | 'declined'
  /** Motivo/mensagem opcional da parceira sobre a decisão */
  partnerDecisionReason?: string
  createdAt: number
  updatedAt: number
}

/** Status do convite de parceria */
export type PartnershipStatus = 'pending' | 'accepted' | 'rejected'

/**
 * Representa o vínculo entre dois usuários (quem enviou e quem recebeu).
 * Armazenada na coleção `partnerships` do Firestore.
 */
export interface Partnership {
  id: string
  /** UID de quem enviou o convite */
  requesterId: string
  requesterEmail: string
  requesterName: string
  requesterPhoto?: string | null
  /** UID de quem recebeu */
  recipientId: string
  recipientEmail: string
  recipientName: string
  recipientPhoto?: string | null
  status: PartnershipStatus
  /** Motivo da recusa do convite de parceria (preenchido pela destinatária) */
  rejectionReason?: string
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

// ─── Preferências do usuário ──────────────────────────────────────────────────

export interface PreferenceCategory {
  /** Coisas que adora fazer */
  activitiesLoves: string[]
  /** Lugares que adora ir */
  placesLoves: string[]
  /** Lugares que não vai de jeito nenhum */
  placesNever: string[]
  /** Lugares que não gosta mas vai */
  placesTolerate: string[]
  /** Comidas que gosta */
  foodLoves: string[]
  /** Comidas que não come de jeito nenhum */
  foodNever: string[]
  /** Comidas que come com exceção */
  foodTolerate: string[]
  /** Outros gostos livres */
  otherNotes: string
}

export interface UserPreferences {
  /** UID do usuário */
  userId: string
  preferences: PreferenceCategory
  updatedAt: number
}
