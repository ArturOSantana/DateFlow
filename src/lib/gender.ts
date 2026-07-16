import type { PartnerGender } from '../types'

/**
 * Retorna pronomes para se referir à parceira/parceiro do usuário logado.
 * Ou seja: quem o usuário logado está chamando de "ela/ele".
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

/**
 * Retorna pronomes para o dono da conta, vistos PELA parceira/parceiro.
 * Ex: "Ele planejou", "Dates dele", "Aceitou o convite dele"
 * Default: masculino ('m') — a maioria dos casos de uso iniciais.
 */
export function getOwnerPronouns(gender: PartnerGender | undefined) {
  const m = !gender || gender === 'm'
  return {
    /** "ele" / "ela" */
    subject: m ? 'ele' : 'ela',
    /** "dele" / "dela" */
    of: m ? 'dele' : 'dela',
    /** Artigo definido "o" / "a" */
    article: m ? 'o' : 'a',
    /** "parceiro" / "parceira" */
    partner: m ? 'parceiro' : 'parceira',
    /** "Parceiro" / "Parceira" */
    Partner: m ? 'Parceiro' : 'Parceira',
    /** "Dates dele" / "Dates dela" */
    datesOf: m ? 'Dates dele' : 'Dates dela',
    /** "planejados por ele" / "planejados por ela" */
    plannedBy: m ? 'planejados por ele' : 'planejados por ela',
    /** "quer te planejar um date" */
    wantsToDate: m ? 'quer te planejar um date' : 'quer te planejar um date',
    /** "Preferências dele" / "Preferências dela" para exibir as prefs do dono */
    prefsTitle: m ? 'Preferências dele' : 'Preferências dela',
    /** "Ele planejou" / "Ela planejou" */
    planned: m ? 'Ele planejou' : 'Ela planejou',
  }
}

export type Pronouns = ReturnType<typeof getPronouns>
export type OwnerPronouns = ReturnType<typeof getOwnerPronouns>
