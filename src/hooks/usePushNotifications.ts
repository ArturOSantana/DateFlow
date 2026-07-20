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

export function usePushNotifications(userId: string | null) {
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!userId) {
      // Limpa ao deslogar
      unsubRef.current?.()
      unsubRef.current = null
      // Avisa o service worker para parar de monitorar
      navigator.serviceWorker?.ready.then(reg => {
        reg.active?.postMessage({ type: 'CLEAR_USER' })
      }).catch(() => {})
      return
    }

    let cancelled = false

    async function setup() {
      // Solicita permissão e registra o SW (passa userId para o SW)
      await requestPushPermission(userId!)
      if (cancelled) return

      // Listener em foreground: quando o app está aberto, exibe toast nativo
      unsubRef.current = listenIncomingNotifications(userId!, (title, body, url) => {
        if (document.visibilityState === 'visible') {
          // App em foco: exibe via Notifications API nativa (banner do sistema)
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
        }
        // Se app minimizado/fechado: o service worker já cuida via onSnapshot
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
