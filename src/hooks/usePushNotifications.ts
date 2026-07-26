/**
 * usePushNotifications.ts
 *
 * 1. Solicita permissão de notificação ao usuário
 * 2. Registra o service worker e passa o userId para ele monitorar o Firestore
 * 3. Exibe notificações nativas quando o app está aberto (via onSnapshot)
 * 4. Limpa a assinatura ao deslogar
 */

import { useEffect, useRef } from 'react'
import {
  requestPushPermission,
  listenIncomingNotifications,
} from '../lib/pushNotifications'
import {
  clearNativeNotificationSession,
  initializeNativeNotifications,
  isNativeAndroid,
  showNativeLocalNotification,
} from '../lib/nativeNotifications'

export function usePushNotifications(userId: string | null) {
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!userId) {
      unsubRef.current?.()
      unsubRef.current = null
      void clearNativeNotificationSession()
      navigator.serviceWorker?.ready.then(reg => {
        reg.active?.postMessage({ type: 'CLEAR_USER' })
      }).catch(() => {})
      return
    }

    const currentUserId = userId
    let cancelled = false

    async function setup() {
      if (isNativeAndroid()) {
        await initializeNativeNotifications(currentUserId)
      } else {
        await requestPushPermission(currentUserId)
      }
      if (cancelled) return

      unsubRef.current = listenIncomingNotifications(currentUserId, (title, body, url) => {
        if (isNativeAndroid()) {
          // No Android nativo, sempre dispara a notificação local
          // independente do estado de visibilidade da WebView
          void showNativeLocalNotification(title, body)
          return
        }

        // No browser/PWA, só exibe foreground se o app estiver visível
        // (em background o service worker trata via onSnapshot)
        if (document.visibilityState !== 'visible') return

        if (Notification.permission === 'granted') {
          const notif = new Notification(title, {
            body,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag: 'dateflow-foreground',
          })
          notif.onclick = () => {
            window.focus()
            window.location.pathname = url
          }
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
