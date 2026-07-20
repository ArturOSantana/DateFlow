/**
 * usePushNotifications.ts
 *
 * Hook que:
 * 1. Solicita permissão de push ao usuário
 * 2. Obtém e persiste o FCM token no Firestore
 * 3. Mostra notificações em foreground como toast nativo do browser
 * 4. Limpa o token ao deslogar
 */

import { useEffect, useRef } from 'react'
import {
  requestPushPermission,
  saveFcmToken,
  removeFcmToken,
  listenForegroundMessages,
} from '../lib/pushNotifications'
import { getMessagingInstance } from '../lib/firebase'

export function usePushNotifications(userId: string | null) {
  const tokenRef = useRef<string | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!userId) {
      // Limpa token ao deslogar
      if (tokenRef.current) {
        removeFcmToken(userId ?? '', tokenRef.current).catch(() => {})
        tokenRef.current = null
      }
      unsubRef.current?.()
      unsubRef.current = null
      return
    }

    let cancelled = false

    async function setup() {
      const token = await requestPushPermission()
      if (cancelled || !token) return

      tokenRef.current = token
      await saveFcmToken(userId!, token)

      // Escuta mensagens quando o app está em foreground
      const messaging = await getMessagingInstance()
      if (!messaging || cancelled) return

      unsubRef.current = listenForegroundMessages(messaging, (title, body) => {
        // Usa a Notifications API nativa para mostrar o toast mesmo em foreground
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag: 'dateflow-foreground',
          })
        }
      })
    }

    setup()

    return () => {
      cancelled = true
      unsubRef.current?.()
      unsubRef.current = null
    }
  }, [userId])
}
