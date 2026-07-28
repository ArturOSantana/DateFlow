/**
 * usePushNotifications.ts
 *
 * 1. Se a permissão já foi concedida, registra o service worker imediatamente
 * 2. Exibe notificações nativas quando o app está aberto (via onSnapshot)
 * 3. Limpa a assinatura ao deslogar
 *
 * A solicitação de permissão NÃO ocorre aqui — ela só pode ser acionada por
 * um gesto explícito do usuário (via NotificationPrompt).
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
        // No Android nativo sempre inicializa (inclui pedido de permissão nativo)
        await initializeNativeNotifications(currentUserId)
      } else {
        // No browser/PWA só configura o SW se a permissão já foi concedida.
        // Se ainda for "default", o NotificationPrompt vai pedir via gesto do usuário.
        if (Notification.permission === 'granted') {
          await requestPushPermission(currentUserId)
        }
      }
      if (cancelled) return

      unsubRef.current = listenIncomingNotifications(currentUserId, (title, body, url) => {
        if (isNativeAndroid()) {
          void showNativeLocalNotification(title, body)
          return
        }

        // No browser/PWA, só exibe foreground se o app estiver visível
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
