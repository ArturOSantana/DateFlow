import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from './firebase'
import type { DateEvent, Idea, Partnership } from '../types'

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
 */
export async function getMyPartnerships(userId: string): Promise<Partnership[]> {
  const [snap1, snap2] = await Promise.all([
    getDocs(query(collection(db, 'partnerships'), where('requesterId', '==', userId))),
    getDocs(query(collection(db, 'partnerships'), where('recipientId', '==', userId))),
  ])
  const all: Partnership[] = [
    ...snap1.docs.map(d => ({ id: d.id, ...d.data() } as Partnership)),
    ...snap2.docs.map(d => ({ id: d.id, ...d.data() } as Partnership)),
  ]
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
