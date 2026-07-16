import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import type { AppNotification, DateEvent, Idea, NotificationType, Partnership, UserPreferences, PreferenceCategory } from '../types'

// ─── Dates ───────────────────────────────────────────────────────────────────

export async function getDates(userId: string): Promise<DateEvent[]> {
  const q = query(
    collection(db, 'dates'),
    where('userId', '==', userId),
    orderBy('date', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DateEvent))
}

export async function createDate(data: Omit<DateEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'dates'), {
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  return ref.id
}

export async function updateDate(id: string, data: Partial<DateEvent>): Promise<void> {
  await updateDoc(doc(db, 'dates', id), {
    ...data,
    updatedAt: Date.now(),
  })
}

export async function deleteDate(id: string): Promise<void> {
  await deleteDoc(doc(db, 'dates', id))
}

export async function getDateByShareToken(token: string): Promise<DateEvent | null> {
  const q = query(collection(db, 'dates'), where('shareToken', '==', token))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as DateEvent
}

// ─── Ideas ───────────────────────────────────────────────────────────────────

export async function getIdeas(userId: string): Promise<Idea[]> {
  const q = query(
    collection(db, 'ideas'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Idea))
}

export async function createIdea(data: Omit<Idea, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'ideas'), {
    ...data,
    createdAt: Date.now(),
  })
  return ref.id
}

export async function updateIdea(id: string, data: Partial<Idea>): Promise<void> {
  await updateDoc(doc(db, 'ideas', id), data)
}

export async function deleteIdea(id: string): Promise<void> {
  await deleteDoc(doc(db, 'ideas', id))
}

// ─── Partnerships ─────────────────────────────────────────────────────────────

/**
 * Retorna a parceria ativa (accepted) entre dois usuários, se existir.
 * Busca nas duas direções (quem pediu ↔ quem recebeu).
 */
export async function getPartnership(userAId: string, userBId: string): Promise<Partnership | null> {
  // Busca onde userA é requester e userB é recipient
  const q1 = query(
    collection(db, 'partnerships'),
    where('requesterId', '==', userAId),
    where('recipientId', '==', userBId),
  )
  const snap1 = await getDocs(q1)
  if (!snap1.empty) {
    const d = snap1.docs[0]
    return { id: d.id, ...d.data() } as Partnership
  }

  // Busca onde userB é requester e userA é recipient
  const q2 = query(
    collection(db, 'partnerships'),
    where('requesterId', '==', userBId),
    where('recipientId', '==', userAId),
  )
  const snap2 = await getDocs(q2)
  if (!snap2.empty) {
    const d = snap2.docs[0]
    return { id: d.id, ...d.data() } as Partnership
  }

  return null
}

/**
 * Retorna todas as parcerias de um usuário (como requester ou recipient).
 * Busca também pelo email para capturar convites pendentes onde
 * recipientId ainda é '' (criado antes do destinatário aceitar).
 */
export async function getMyPartnerships(userId: string, userEmail?: string): Promise<Partnership[]> {
  const queries: Promise<import('firebase/firestore').QuerySnapshot>[] = [
    getDocs(query(collection(db, 'partnerships'), where('requesterId', '==', userId))),
    getDocs(query(collection(db, 'partnerships'), where('recipientId', '==', userId))),
  ]
  if (userEmail) {
    queries.push(
      getDocs(query(collection(db, 'partnerships'), where('recipientEmail', '==', userEmail.toLowerCase()))),
    )
  }
  const snaps = await Promise.all(queries)
  // Deduplica por id (pode aparecer nas queries de uid e email ao mesmo tempo)
  const seen = new Set<string>()
  const all: Partnership[] = []
  for (const snap of snaps) {
    for (const d of snap.docs) {
      if (!seen.has(d.id)) {
        seen.add(d.id)
        all.push({ id: d.id, ...d.data() } as Partnership)
      }
    }
  }
  return all
}

export async function createPartnership(data: Omit<Partnership, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'partnerships'), {
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  return ref.id
}

export async function updatePartnership(id: string, data: Partial<Partnership>): Promise<void> {
  await updateDoc(doc(db, 'partnerships', id), {
    ...data,
    updatedAt: Date.now(),
  })
}

export async function deletePartnership(id: string): Promise<void> {
  await deleteDoc(doc(db, 'partnerships', id))
}

/**
 * Busca apenas os dates do dono que foram marcados como "com" o viewer.
 * Só retorna docs onde withPartnerId === viewerUid, garantindo que a
 * parceira veja somente os dates destinados a ela.
 */
export async function getDatesByOwnerForViewer(ownerId: string, viewerUid: string): Promise<DateEvent[]> {
  const q = query(
    collection(db, 'dates'),
    where('userId', '==', ownerId),
    where('withPartnerId', '==', viewerUid),
    orderBy('date', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DateEvent))
}

/**
 * Conta convites de parceria pendentes recebidos pelo usuário.
 * Busca apenas pelo email (pois convites são criados antes do destinatário logar).
 */
export async function getPendingInviteCount(userEmail: string): Promise<number> {
  const q = query(
    collection(db, 'partnerships'),
    where('recipientEmail', '==', userEmail.toLowerCase()),
    where('status', '==', 'pending'),
  )
  const snap = await getDocs(q)
  return snap.size
}

/**
 * Vincula (ou desvincula) uma parceira em todos os dates do dono de uma vez.
 * Atualiza withPartnerId nos dates que ainda não têm parceira vinculada.
 */
export async function linkPartnerToAllDates(ownerId: string, partnerUid: string): Promise<number> {
  const q = query(
    collection(db, 'dates'),
    where('userId', '==', ownerId),
  )
  const snap = await getDocs(q)
  // Atualiza apenas os que ainda não têm parceira vinculada (evita sobrescrever escolhas manuais)
  const toUpdate = snap.docs.filter(d => !d.data().withPartnerId)
  await Promise.all(
    toUpdate.map(d => updateDoc(doc(db, 'dates', d.id), { withPartnerId: partnerUid, updatedAt: Date.now() }))
  )
  return toUpdate.length
}

// ─── User Preferences ─────────────────────────────────────────────────────────

export async function getUserPreferences(userId: string): Promise<PreferenceCategory | null> {
  const ref = doc(db, 'userPreferences', userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data() as UserPreferences
  return data.preferences ?? null
}

export async function saveUserPreferences(userId: string, preferences: PreferenceCategory): Promise<void> {
  const ref = doc(db, 'userPreferences', userId)
  await setDoc(ref, { userId, preferences, updatedAt: Date.now() }, { merge: true })
}

/** Retorna o gênero que o usuário definiu para si mesmo no perfil. */
export async function getUserGender(userId: string): Promise<import('../types').PartnerGender | undefined> {
  const ref = doc(db, 'userPreferences', userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return undefined
  const data = snap.data() as UserPreferences
  return data.ownerGender
}

/** Salva apenas o gênero do usuário (sem sobrescrever as preferências). */
export async function saveUserGender(userId: string, ownerGender: import('../types').PartnerGender): Promise<void> {
  const ref = doc(db, 'userPreferences', userId)
  await setDoc(ref, { userId, ownerGender, updatedAt: Date.now() }, { merge: true })
}

/**
 * Retorna os dates planejados POR outros usuários onde withPartnerId === viewerUid.
 * Usado para mostrar ao usuário os dates que alguém planejou para ele/ela.
 */
export async function getIncomingDates(viewerUid: string): Promise<DateEvent[]> {
  const q = query(
    collection(db, 'dates'),
    where('withPartnerId', '==', viewerUid),
    orderBy('date', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DateEvent))
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(data: {
  toUserId: string
  type: NotificationType
  dateId: string
  dateTitle: string
  fromName: string
  reason?: string
}): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    ...data,
    read: false,
    createdAt: Date.now(),
  })
}

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification))
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', id), { read: true })
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId),
    where('read', '==', false),
  )
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })))
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId),
    where('read', '==', false),
  )
  const snap = await getDocs(q)
  return snap.size
}

// ─── Brasa Sessions ───────────────────────────────────────────────────────────

export interface BrasaAnswer {
  playerId: 'p1' | 'p2'
  value: string  // texto da resposta ou 'p1'/'p2' para votos
  submittedAt: number
}

export interface BrasaSession {
  id: string
  code: string          // 4 letras — chave de entrada
  p1Uid: string
  p1Name: string
  p2Uid?: string
  p2Name?: string
  status: 'waiting' | 'playing' | 'done'
  /** IDs das cartas do deck atual, em ordem */
  deckIds: string[]
  cardIndex: number
  act: number           // 1 | 2 | 3 | 99 (bonus)
  brasa: number         // 0–100
  p1Pts: number
  p2Pts: number
  completedCards: number
  bonusUnlocked: boolean
  finalChallengeId?: string
  /** Respostas da carta atual: p1Answer e p2Answer */
  p1Answer?: BrasaAnswer
  p2Answer?: BrasaAnswer
  /** Wildcard ativo no momento */
  activeWildcardId?: string
  doublePts: boolean
  createdAt: number
  updatedAt: number
}

/** Cria uma nova sessão Brasa */
export async function createBrasaSession(
  p1Uid: string,
  p1Name: string,
  code: string,
  deckIds: string[],
): Promise<string> {
  const ref = await addDoc(collection(db, 'brasaSessions'), {
    code: code.toUpperCase(),
    p1Uid,
    p1Name,
    status: 'waiting',
    deckIds,
    cardIndex: 0,
    act: 1,
    brasa: 0,
    p1Pts: 0,
    p2Pts: 0,
    completedCards: 0,
    bonusUnlocked: false,
    doublePts: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } satisfies Omit<BrasaSession, 'id'>)
  return ref.id
}

/** Busca sessão pelo código */
export async function getBrasaSessionByCode(code: string): Promise<BrasaSession | null> {
  const q = query(
    collection(db, 'brasaSessions'),
    where('code', '==', code.toUpperCase()),
    where('status', '==', 'waiting'),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as BrasaSession
}

/** Jogador 2 entra na sessão */
export async function joinBrasaSession(
  sessionId: string,
  p2Uid: string,
  p2Name: string,
): Promise<void> {
  await updateDoc(doc(db, 'brasaSessions', sessionId), {
    p2Uid,
    p2Name,
    status: 'playing',
    updatedAt: Date.now(),
  })
}

/** Atualiza campos arbitrários da sessão */
export async function updateBrasaSession(
  sessionId: string,
  data: Partial<Omit<BrasaSession, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'brasaSessions', sessionId), {
    ...data,
    updatedAt: Date.now(),
  })
}

/** Assina a sessão em tempo real (onSnapshot) */
export function subscribeBrasaSession(
  sessionId: string,
  callback: (session: BrasaSession) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'brasaSessions', sessionId), snap => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() } as BrasaSession)
  })
}
