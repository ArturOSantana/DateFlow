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

// ─── Notificações in-app ──────────────────────────────────────────────────────

export type NotificationType =
  | 'date_accepted'   // parceiro aceitou o date
  | 'date_declined'   // parceiro recusou o date

export interface AppNotification {
  id: string
  /** UID do usuário que deve receber a notificação (dono do date) */
  toUserId: string
  type: NotificationType
  /** ID do date relacionado */
  dateId: string
  /** Título do date (para mostrar na notificação) */
  dateTitle: string
  /** Nome de quem respondeu */
  fromName: string
  /** Motivo da recusa, se houver */
  reason?: string
  read: boolean
  createdAt: number
}

/** Status do convite de parceria */
export type PartnershipStatus = 'pending' | 'accepted' | 'rejected'

/** Gênero da pessoa convidada, definido por quem envia o convite */
export type PartnerGender = 'f' | 'm'

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
  /**
   * Gênero da pessoa convidada (definido por quem enviou o convite).
   * 'f' = ela / parceira  |  'm' = ele / parceiro
   * Default implícito: 'f'
   */
  partnerGender?: PartnerGender
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
  /**
   * Gênero do próprio usuário — usado para que a parceira/parceiro
   * veja os pronomes corretos ao se referir a quem planejou os dates.
   * 'f' = ela / 'm' = ele. Default implícito: 'm'
   */
  ownerGender?: PartnerGender
  updatedAt: number
}
