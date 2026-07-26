/**
 * pushNotifications.ts
 *
 * Push notifications com dois mecanismos de entrega:
 *
 * 1. Firestore onSnapshot (service worker / React hook)
 *    - Funciona no plano Spark (gratuito)
 *    - App aberto  → notificação em < 1s via onSnapshot no React
 *    - App minimizado / fechado → service worker detecta e mostra a notificação
 *
 * 2. FCM v1 API via Cloud Function `sendPushNotification` (plano Blaze)
 *    - Entrega garantida mesmo quando o service worker está inativo
 *    - Chamado automaticamente por sendPushToUser() quando o usuário tem
 *      FCM tokens registrados no Firestore
 */

import { getToken, onMessage, type Messaging } from 'firebase/messaging'
import { getFunctions, httpsCallable } from 'firebase/functions'
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore'
import { db, firebaseConfig, getMessagingInstance } from './firebase'
import type { NotificationType } from '../types'

export type { NotificationType }

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

// ─── Labels das notificações (usadas também no service worker) ───────────────

export const NOTIFICATION_LABELS: Record<NotificationType, {
  title: string
  body: (from: string, dateTitle: string, extra?: string) => string
}> = {
  date_accepted:   { title: '💚 Date aceito!',         body: (f, t)    => `${f} aceitou o date "${t}"` },
  date_declined:   { title: '❌ Date recusado',         body: (f, t, r) => r ? `${f} recusou "${t}": ${r}` : `${f} recusou o date "${t}"` },
  date_cancelled:  { title: '🚫 Date cancelado',        body: (f, t, r) => r ? `${f} cancelou "${t}": ${r}` : `${f} cancelou o date "${t}"` },
  date_changed:    { title: '📅 Date alterado',         body: (f, t, e) => e ? `${f} alterou "${t}" para ${e}` : `${f} alterou o date "${t}"` },
  date_created:    { title: '🆕 Novo date pra vocês!',  body: (f, t, e) => e ? `${f} criou "${t}" para ${e}` : `${f} criou um novo date: "${t}"` },
  date_confirmed:  { title: '✅ Date confirmado!',      body: (f, t, e) => e ? `${f} confirmou "${t}" para ${e}` : `${f} confirmou o date "${t}"` },
  date_done:       { title: '🎉 Date realizado!',       body: (f, t)    => `${f} marcou "${t}" como realizado. Como foi?` },
  invite_accepted: { title: '🤝 Convite aceito!',       body: (f)       => `${f} aceitou seu convite de parceria` },
  invite_rejected: { title: '💔 Convite recusado',      body: (f, _, r) => r ? `${f} recusou o convite: ${r}` : `${f} recusou seu convite de parceria` },
  partner_note:    { title: '📝 Nova observação',       body: (f, t)    => `${f} deixou uma observação no date "${t}"` },
  partner_rated:   { title: '⭐ Avaliação recebida',    body: (f, t, r) => r ? `${f} avaliou "${t}" com ${r}` : `${f} avaliou o date "${t}"` },
}

// ─── Registro do service worker ──────────────────────────────────────────────

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
    // Passa a config do Firebase para o SW inicializar o Firestore listener
    const send = (sw: ServiceWorker) =>
      sw.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig })
    if (reg.installing) send(reg.installing)
    else if (reg.waiting) send(reg.waiting)
    else if (reg.active) send(reg.active)
    navigator.serviceWorker.ready.then(r => r.active && send(r.active))
    return reg
  } catch {
    return null
  }
}

// ─── Permissão de notificação ─────────────────────────────────────────────────

/**
 * Solicita permissão de notificação ao usuário e registra o service worker.
 * Opcionalmente obtém o FCM token (usado apenas se VAPID key estiver configurada).
 * Retorna true se a permissão foi concedida.
 */
export async function requestPushPermission(userId: string): Promise<boolean> {
  if (!('Notification' in window)) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  // Registra o service worker e passa o userId para ele monitorar as notificações
  const swReg = await registerServiceWorker()
  if (!swReg) return false

  // Avisa o SW qual usuário está logado para ele assinar o onSnapshot correto
  const sw = swReg.active ?? swReg.waiting ?? swReg.installing
  if (sw) sw.postMessage({ type: 'SET_USER_ID', userId })
  navigator.serviceWorker.ready.then(r => {
    r.active?.postMessage({ type: 'SET_USER_ID', userId })
  })

  // Se VAPID key estiver configurada, também registra o FCM token
  if (VAPID_KEY) {
    const messaging = await getMessagingInstance()
    if (messaging) {
      try {
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        })
        if (token) await saveFcmToken(userId, token)
      } catch {
        // VAPID opcional — sem ela ainda funciona via onSnapshot
      }
    }
  }

  return true
}

/**
 * Handler de mensagens FCM em foreground (app com foco na aba).
 * Exibe uma notificação nativa quando o app está aberto.
 */
export function listenForegroundMessages(
  messaging: Messaging,
  callback: (title: string, body: string) => void
): () => void {
  return onMessage(messaging, payload => {
    const title = payload.notification?.title ?? 'DateFlow'
    const body  = payload.notification?.body  ?? ''
    callback(title, body)
  })
}

// ─── FCM tokens no Firestore (opcional, para entrega garantida via FCM) ───────

export async function saveFcmToken(userId: string, token: string): Promise<void> {
  const id = `${userId}_${token.slice(-16)}`
  await setDoc(doc(db, 'fcmTokens', id), { userId, token, updatedAt: Date.now() })
}

export async function removeFcmToken(userId: string, token: string): Promise<void> {
  const id = `${userId}_${token.slice(-16)}`
  await deleteDoc(doc(db, 'fcmTokens', id))
}

// ─── sendPushToUser — FCM v1 via Cloud Function ──────────────────────────────

/**
 * Envia push via Cloud Function `sendPushNotification` (FCM v1 API).
 * Requer plano Blaze do Firebase e que o destinatário tenha ao menos um
 * FCM token registrado em `fcmTokens/`.
 *
 * Falha silenciosamente: se a Cloud Function não estiver disponível (plano
 * Spark ou sem tokens), a entrega continua garantida pelo onSnapshot do SW.
 */
export async function sendPushToUser(params: {
  toUserId: string
  type: NotificationType
  fromName: string
  dateTitle: string
  dateId: string
  reason?: string
  dateValue?: string
  timeValue?: string
  rating?: number
}): Promise<void> {
  try {
    const fns = getFunctions(undefined, 'southamerica-east1')
    const fn = httpsCallable(fns, 'sendPushNotification')
    await fn(params)
  } catch {
    // Falha silenciosa — entrega via onSnapshot do SW continua ativa
  }
}

// ─── Listener em tempo real (app aberto) ─────────────────────────────────────

/**
 * Monitora notificações novas em tempo real no app aberto.
 * Exibe uma notificação nativa da Notifications API quando chega algo novo.
 */
export function listenIncomingNotifications(
  userId: string,
  onNew: (title: string, body: string, url: string) => void
): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId),
    where('read', '==', false),
  )

  const startedAt = Date.now()
  let initialized = false

  return onSnapshot(q, snap => {
    if (!initialized) { initialized = true; return }

    snap.docChanges().forEach(change => {
      if (change.type !== 'added') return
      const data = change.doc.data()
      if ((data.createdAt ?? 0) < startedAt) return

      const label = NOTIFICATION_LABELS[data.type as NotificationType]
      if (!label) return

      let extra: string | undefined
      if (data.reason) extra = data.reason
      if (data.rating) extra = '⭐'.repeat(data.rating as number)

      const title = label.title
      const body  = label.body(data.fromName ?? '', data.dateTitle ?? '', extra)
      const url   = data.dateId ? `/dates/${data.dateId}` : '/partner'

      onNew(title, body, url)
    })
  })
}
