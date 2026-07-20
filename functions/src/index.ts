import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

admin.initializeApp()

const db = admin.firestore()

// Tipos espelhados do front-end
type NotificationType =
  | 'date_accepted'
  | 'date_declined'
  | 'date_cancelled'
  | 'date_changed'
  | 'date_created'
  | 'date_confirmed'
  | 'date_done'
  | 'invite_accepted'
  | 'invite_rejected'
  | 'partner_note'
  | 'partner_rated'

interface SendPushPayload {
  toUserId: string
  type: NotificationType
  fromName: string
  dateTitle: string
  dateId: string
  reason?: string
  dateValue?: string
  timeValue?: string
  rating?: number
}

const LABELS: Record<NotificationType, {
  title: string
  body: (from: string, title: string, extra?: string) => string
}> = {
  date_accepted: {
    title: '💚 Date aceito!',
    body: (from, title) => `${from} aceitou o date "${title}"`,
  },
  date_declined: {
    title: '❌ Date recusado',
    body: (from, title, reason) =>
      reason ? `${from} recusou "${title}": ${reason}` : `${from} recusou o date "${title}"`,
  },
  date_cancelled: {
    title: '🚫 Date cancelado',
    body: (from, title, reason) =>
      reason ? `${from} cancelou "${title}": ${reason}` : `${from} cancelou o date "${title}"`,
  },
  date_changed: {
    title: '📅 Date alterado',
    body: (from, title, extra) =>
      extra ? `${from} alterou "${title}" para ${extra}` : `${from} alterou o date "${title}"`,
  },
  date_created: {
    title: '🆕 Novo date pra vocês!',
    body: (from, title) => `${from} criou um novo date: "${title}"`,
  },
  date_confirmed: {
    title: '✅ Date confirmado!',
    body: (from, title) => `${from} confirmou o date "${title}"`,
  },
  date_done: {
    title: '🎉 Date realizado!',
    body: (from, title) => `${from} marcou "${title}" como realizado. Como foi?`,
  },
  invite_accepted: {
    title: '🤝 Convite aceito!',
    body: (from) => `${from} aceitou seu convite de parceria`,
  },
  invite_rejected: {
    title: '💔 Convite recusado',
    body: (from, _, reason) =>
      reason ? `${from} recusou o convite: ${reason}` : `${from} recusou seu convite de parceria`,
  },
  partner_note: {
    title: '📝 Nova observação',
    body: (from, title) => `${from} deixou uma observação no date "${title}"`,
  },
  partner_rated: {
    title: '⭐ Avaliação recebida',
    body: (from, title, extra) =>
      extra ? `${from} avaliou "${title}" com ${extra}` : `${from} avaliou o date "${title}"`,
  },
}

/**
 * Callable function: recebe o payload de notificação do cliente,
 * busca os FCM tokens do destinatário no Firestore e envia via FCM v1 API.
 *
 * O cliente chama com: httpsCallable(functions, 'sendPushNotification')(payload)
 * A autenticação é validada automaticamente pelo Firebase Functions.
 */
export const sendPushNotification = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    // Garante que apenas usuários autenticados chamem a função
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Autenticação necessária.')
    }

    const data = request.data as SendPushPayload

    // Validação básica do payload
    if (!data.toUserId || !data.type) {
      throw new HttpsError('invalid-argument', 'Payload inválido.')
    }

    // Busca todos os FCM tokens do destinatário
    const snap = await db
      .collection('fcmTokens')
      .where('userId', '==', data.toUserId)
      .get()

    if (snap.empty) return { sent: 0 }

    const tokens = snap.docs.map(d => d.data().token as string)

    // Monta texto da notificação
    const label = LABELS[data.type]
    let extra: string | undefined
    if (data.type === 'date_changed' && (data.dateValue || data.timeValue)) {
      const parts: string[] = []
      if (data.dateValue) {
        parts.push(
          new Date(`${data.dateValue}T12:00:00`).toLocaleDateString('pt-BR')
        )
      }
      if (data.timeValue) parts.push(`às ${data.timeValue}`)
      extra = parts.join(' ')
    } else if (data.type === 'partner_rated' && data.rating) {
      extra = `${data.rating} ⭐`
    } else if (data.reason) {
      extra = data.reason
    }

    const title = label.title
    const body = label.body(data.fromName, data.dateTitle, extra)
    const url = `/dates/${data.dateId}`

    // Envia para todos os dispositivos do destinatário via FCM v1 API
    const messaging = admin.messaging()
    const results = await Promise.allSettled(
      tokens.map(token =>
        messaging.send({
          token,
          notification: { title, body },
          webpush: {
            headers: { Urgency: 'high' },
            notification: {
              title,
              body,
              icon: '/favicon.svg',
              badge: '/favicon.svg',
              requireInteraction: false,
              vibrate: [200, 100, 200],
            },
            fcmOptions: { link: url },
          },
          data: {
            url,
            notificationId: data.dateId,
          },
        })
      )
    )

    // Remove tokens inválidos/expirados do Firestore
    const expiredTokens: string[] = []
    results.forEach((result, i) => {
      if (
        result.status === 'rejected' &&
        (result.reason?.errorInfo?.code === 'messaging/registration-token-not-registered' ||
          result.reason?.errorInfo?.code === 'messaging/invalid-registration-token')
      ) {
        expiredTokens.push(tokens[i])
      }
    })

    if (expiredTokens.length > 0) {
      const batch = db.batch()
      for (const token of expiredTokens) {
        const id = `${data.toUserId}_${token.slice(-16)}`
        batch.delete(db.doc(`fcmTokens/${id}`))
      }
      await batch.commit()
    }

    const sent = results.filter(r => r.status === 'fulfilled').length
    return { sent }
  }
)
