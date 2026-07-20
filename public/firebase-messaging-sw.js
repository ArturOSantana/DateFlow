// Service Worker para notificações em tempo real — plano Spark (gratuito)
//
// Estratégia: usa o Firestore SDK compat (compatível com importScripts) para
// abrir um onSnapshot nas notificações não lidas do usuário logado.
// Quando um documento novo chega, o SW exibe a notificação nativa do sistema
// — mesmo com o app fechado ou minimizado.

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore-compat.js')

let db = null
let currentUserId = null
let unsubscribe = null
let startedAt = 0

function initFirebase(config) {
  if (firebase.apps.length === 0) {
    firebase.initializeApp(config)
  }
  db = firebase.firestore()
}

function subscribeNotifications(userId) {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  if (!db || !userId) return

  currentUserId = userId
  startedAt = Date.now()

  const q = db.collection('notifications')
    .where('toUserId', '==', userId)
    .where('read', '==', false)

  let initialized = false

  unsubscribe = q.onSnapshot(snap => {
    if (!initialized) { initialized = true; return }

    snap.docChanges().forEach(change => {
      if (change.type !== 'added') return
      const data = change.doc.data()
      if ((data.createdAt || 0) < startedAt) return

      const label = LABELS[data.type]
      if (!label) return

      let extra
      if (data.reason) extra = data.reason
      if (data.rating) extra = '⭐'.repeat(data.rating)

      const title = label.title
      const body  = label.body(data.fromName || '', data.dateTitle || '', extra)
      const url   = data.dateId ? `/dates/${data.dateId}` : '/partner'

      self.registration.showNotification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: change.doc.id,
        data: { url },
        vibrate: [200, 100, 200],
      })
    })
  })
}

// Labels espelhados de pushNotifications.ts (service worker não pode importar TS)
const LABELS = {
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

// Recebe mensagens do app principal
self.addEventListener('message', event => {
  const { type, config, userId } = event.data ?? {}

  if (type === 'FIREBASE_CONFIG' && config) {
    initFirebase(config)
    // Se já tinha um userId pendente, assina agora
    if (currentUserId) subscribeNotifications(currentUserId)
  }

  if (type === 'SET_USER_ID') {
    currentUserId = userId
    if (db) subscribeNotifications(userId)
  }

  if (type === 'CLEAR_USER') {
    if (unsubscribe) { unsubscribe(); unsubscribe = null }
    currentUserId = null
  }
})

// Ao clicar na notificação: abre/foca a aba do app
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  const fullUrl = self.location.origin + url

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(fullUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(fullUrl)
    })
  )
})
