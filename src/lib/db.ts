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
import type { DateEvent, Idea } from '../types'

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
