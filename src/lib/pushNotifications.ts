/**
 * pushNotifications.ts
 *
 * Responsável por:
 * 1. Registrar o service worker do FCM
 * 2. Solicitar permissão ao usuário
 * 3. Obter o FCM token do dispositivo
 * 4. Salvar/remover o token no Firestore (coleção `fcmTokens`)
 * 5. Enviar push via Cloud Function `sendPushNotification` (sem server key no cliente)
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
  getDocs,
} from 'firebase/firestore'
import { db, firebaseConfig, getMessagingInstance } from './firebase'
import type { NotificationType } from '../types'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

// ─── Registro do service worker ──────────────────────────────────────────────

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    })
    // Envia a config do Firebase para o service worker inicializar o FCM
    const sw = reg.installing ?? reg.waiting ?? reg.active
    if (sw) {
      sw.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig })
    }
    navigator.serviceWorker.ready.then(readyReg => {
      readyReg.active?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig })
    })
    return reg
  } catch {
    return null
  }
}

// ─── Permissão e token ────────────────────────────────────────────────────────

/**
 * Solicita permissão de notificação e retorna o FCM token do dispositivo.
 * Retorna null se não suportado ou permissão negada.
 */
export async function requestPushPermission(): Promise<string | null> {
  if (!VAPID_KEY) {
    console.warn('[Push] VITE_FIREBASE_VAPID_KEY não configurado — push desabilitado.')
    return null
  }

  const messaging = await getMessagingInstance()
  if (!messaging) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const swReg = await registerServiceWorker()
  if (!swReg) return null

  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    })
    return token ?? null
  } catch {
    return null
  }
}

/**
 * Configura o handler de mensagens em foreground (app aberto).
 */
export function listenForegroundMessages(
  messaging: Messaging,
  callback: (title: string, body: string, data?: Record<string, string>) => void
): () => void {
  return onMessage(messaging, payload => {
    const title = payload.notification?.title ?? 'DateFlow'
    const body = payload.notification?.body ?? ''
    const data = payload.data as Record<string, string> | undefined
    callback(title, body, data)
  })
}

// ─── Persistência dos tokens no Firestore ────────────────────────────────────

export async function saveFcmToken(userId: string, token: string): Promise<void> {
  const id = `${userId}_${token.slice(-16)}`
  await setDoc(doc(db, 'fcmTokens', id), {
    userId,
    token,
    updatedAt: Date.now(),
  })
}

export async function removeFcmToken(userId: string, token: string): Promise<void> {
  const id = `${userId}_${token.slice(-16)}`
  await deleteDoc(doc(db, 'fcmTokens', id))
}

export async function getFcmTokens(userId: string): Promise<string[]> {
  const q = query(collection(db, 'fcmTokens'), where('userId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data().token as string)
}

// ─── Envio via Cloud Function (FCM v1 API com credenciais de admin) ───────────

/**
 * Chama a Cloud Function `sendPushNotification` que envia o push usando
 * firebase-admin (FCM v1 API). Não precisa de server key no cliente.
 *
 * A função está em southamerica-east1 para menor latência no Brasil.
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
}): Promise<void> {
  try {
    const functions = getFunctions(undefined, 'southamerica-east1')
    const callFn = httpsCallable(functions, 'sendPushNotification')
    await callFn(params)
  } catch {
    // Falha no push não bloqueia o fluxo principal
    // A notificação in-app (Firestore) já foi salva e aparece no sino
  }
}
