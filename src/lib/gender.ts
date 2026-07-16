import type { PartnerGender } from '../types'

/**
 * Retorna pronomes e termos genéricos de acordo com o gênero da parceira/parceiro.
 * Default: feminino ('f') para manter compatibilidade com dados antigos.
 */
export function getPronouns(gender: PartnerGender | undefined) {
  const f = !gender || gender === 'f'
  return {
    /** "ela" / "ele" */
    subject: f ? 'ela' : 'ele',
    /** "dela" / "dele" */
    of: f ? 'dela' : 'dele',
    /** "a ela" / "a ele" */
    to: f ? 'a ela' : 'a ele',
    /** "parceira" / "parceiro" */
    partner: f ? 'parceira' : 'parceiro',
    /** "Parceira" / "Parceiro" (capitalizado) */
    Partner: f ? 'Parceira' : 'Parceiro',
    /** "a parceira" / "o parceiro" */
    thePartner: f ? 'a parceira' : 'o parceiro',
    /** "da parceira" / "do parceiro" */
    ofPartner: f ? 'da parceira' : 'do parceiro',
    /** "Para a parceira" / "Para o parceiro" */
    forPartner: f ? 'Para a parceira' : 'Para o parceiro',
    /** "Preferências dela" / "Preferências dele" */
    prefsTitle: f ? 'Preferências dela' : 'Preferências dele',
    /** artigo "a" / "o" */
    article: f ? 'a' : 'o',
    /** "Aceitou" / "Aceitou" (mesmo para ambos) */
    accepted: 'Aceitou',
    /** "Recusou" */
    declined: 'Recusou',
    /** "Motivo dela:" / "Motivo dele:" */
    reasonOf: f ? 'Motivo dela:' : 'Motivo dele:',
    /** "Visível para ela" / "Visível para ele" */
    visibleFor: f ? 'Visível para ela' : 'Visível para ele',
    /** "Ela vê os gastos" / "Ele vê os gastos" */
    seesExpenses: f ? 'Ela vê os gastos' : 'Ele vê os gastos',
    /** "Chamei ela" / "Chamei ele" */
    calledThem: f ? 'Chamei ela' : 'Chamei ele',
    /** "Ver dates dela" / "Ver dates dele" */
    viewDates: f ? 'Ver dates dela' : 'Ver dates dele',
    /** "Compartilhar todos os meus dates com ela" / "…com ele" */
    shareAllDates: f ? 'Compartilhar todos os meus dates com ela' : 'Compartilhar todos os meus dates com ele',
  }
}

export type Pronouns = ReturnType<typeof getPronouns>
