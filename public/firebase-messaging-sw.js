// Service Worker para Firebase Cloud Messaging
// Este arquivo PRECISA estar na raiz do domínio (/firebase-messaging-sw.js)
// para que o FCM consiga entregar push notifications mesmo com o app fechado.

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js')

// As variáveis de ambiente do Vite NÃO estão disponíveis no service worker.
// Precisamos embutir os valores aqui via substitution no build,
// ou usar um endpoint de configuração. A solução mais simples e segura é
// usar o __FIREBASE_CONFIG__ que é injetado pelo nosso código em firebase.ts.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebase.initializeApp(event.data.config)
    const messaging = firebase.messaging()

    // Exibe a notificação quando o app está em background (página fechada/minimizada)
    messaging.onBackgroundMessage(payload => {
      const { title = 'DateFlow', body = '' } = payload.notification ?? {}
      self.registration.showNotification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: payload.data?.notificationId ?? 'dateflow',
        data: payload.data,
        vibrate: [200, 100, 200],
      })
    })
  }
})

// Ao clicar na notificação abre/foca a aba do app
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Se já houver uma aba aberta, apenas foca
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Senão abre uma nova aba
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
