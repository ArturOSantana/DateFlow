import { Capacitor } from '@capacitor/core'
import {
  LocalNotifications,
  type ScheduleOptions,
} from '@capacitor/local-notifications'
import {
  PushNotifications,
  type Token,
} from '@capacitor/push-notifications'
import { doc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const ANDROID_CHANNEL_ID = 'dateflow-default'
let localNotificationsInitialized = false
let pushNotificationsInitialized = false

export function isNativeAndroid() {
  return Capacitor.getPlatform() === 'android'
}

export async function initializeNativeNotifications(userId: string): Promise<void> {
  if (!isNativeAndroid()) return

  await initializeLocalNotifications()
  await initializePushNotifications(userId)
}

async function initializeLocalNotifications() {
  if (localNotificationsInitialized) return

  await LocalNotifications.requestPermissions()
  await LocalNotifications.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'DateFlow',
    description: 'Notificações do aplicativo DateFlow',
    importance: 4,
    visibility: 1,
  })

  localNotificationsInitialized = true
}

async function initializePushNotifications(userId: string) {
  if (pushNotificationsInitialized) return

  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') return

  PushNotifications.addListener('registration', token => {
    void saveNativePushToken(userId, token)
  })

  PushNotifications.addListener('registrationError', () => {
    // registro de push é opcional; notificações locais continuam funcionando
  })

  PushNotifications.addListener('pushNotificationReceived', notification => {
    void showNativeLocalNotification(
      notification.title ?? 'DateFlow',
      notification.body ?? '',
    )
  })

  await PushNotifications.register()
  pushNotificationsInitialized = true
}

async function saveNativePushToken(userId: string, token: Token) {
  const docId = `${userId}_${token.value.slice(-16)}`
  await setDoc(doc(db, 'fcmTokens', docId), {
    userId,
    token: token.value,
    platform: 'android',
    updatedAt: Date.now(),
  })
}

export async function showNativeLocalNotification(title: string, body: string) {
  if (!isNativeAndroid()) return

  // LocalNotifications requer id como inteiro de 32 bits.
  // Date.now() tem 13 dígitos e transborda; usa-se os últimos 9 dígitos (< 2^31).
  const id = Date.now() % 2_000_000_000

  const notification: ScheduleOptions = {
    notifications: [
      {
        id,
        title,
        body,
        channelId: ANDROID_CHANNEL_ID,
        smallIcon: 'ic_stat_name',
      },
    ],
  }

  await LocalNotifications.schedule(notification)
}

export async function clearNativeNotificationSession() {
  if (!isNativeAndroid()) return

  await PushNotifications.removeAllListeners()
  pushNotificationsInitialized = false
}
