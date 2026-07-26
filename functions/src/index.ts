import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import * as nodemailer from 'nodemailer'

admin.initializeApp()

const db = admin.firestore()

// ─── Secrets (definidos via: firebase functions:secrets:set SMTP_USER) ────────
const SMTP_HOST = defineSecret('SMTP_HOST')
const SMTP_PORT = defineSecret('SMTP_PORT')
const SMTP_USER = defineSecret('SMTP_USER')
const SMTP_PASS = defineSecret('SMTP_PASS')
const SMTP_FROM = defineSecret('SMTP_FROM') // ex: "DateFlow <noreply@seudominio.com>"

// ─── Tipos espelhados do front-end ────────────────────────────────────────────

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

interface SendEmailPayload {
  /** ID do DateEvent no Firestore */
  dateId: string
  /** E-mail da destinatária/o */
  toEmail: string
  /** Nome da destinatária/o */
  toName: string
  /** Nome de quem criou o date */
  fromName: string
  /** Tipo de evento que gerou o e-mail */
  type: 'date_created' | 'date_confirmed' | 'date_changed' | 'date_cancelled'
  /** Link público do date (página /share/:token) */
  shareUrl?: string
}

// ─── Labels para push ─────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Formata data ISO (yyyy-MM-dd) para exibição humana em pt-BR */
function fmtDate(iso: string): string {
  try {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch {
    return iso
  }
}

/** Gera conteúdo iCalendar (.ics) compatível com RFC 5545 */
function buildIcs(params: {
  uid: string
  title: string
  date: string    // yyyy-MM-dd
  time: string    // HH:mm
  location?: string
  description?: string
  organizer: { name: string; email: string }
  attendeeEmail?: string
}): string {
  const [year, month, day] = params.date.split('-').map(Number)
  const [hour, minute]     = params.time.split(':').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')

  const dtStart = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`
  const dtEnd   = `${year}${pad(month)}${pad(day)}T${pad(hour + 2)}${pad(minute)}00`
  const now     = new Date()
  const stamp   = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`

  const fold = (v: string) => {
    const escaped = v
      .replace(/\\/g, '\\\\').replace(/;/g, '\\;')
      .replace(/,/g, '\\,').replace(/\n/g, '\\n')
    let out = ''
    let rem = escaped
    while (rem.length > 75) { out += rem.slice(0, 75) + '\r\n '; rem = rem.slice(75) }
    return out + rem
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DateFlow//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${params.uid}@dateflow.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${fold(params.title)}`,
    `ORGANIZER;CN="${fold(params.organizer.name)}":mailto:${params.organizer.email}`,
  ]
  if (params.location)    lines.push(`LOCATION:${fold(params.location)}`)
  if (params.description) lines.push(`DESCRIPTION:${fold(params.description)}`)
  if (params.attendeeEmail) {
    lines.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${params.attendeeEmail}`)
  }
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

/** Monta o HTML do e-mail de acordo com o tipo de notificação */
function buildEmailHtml(params: {
  toName: string
  fromName: string
  type: SendEmailPayload['type']
  dateTitle: string
  dateFormatted?: string
  time?: string
  location?: string
  shareUrl?: string
}): { subject: string; html: string } {
  const { toName, fromName, type, dateTitle, dateFormatted, time, location, shareUrl } = params

  const SUBJECTS: Record<SendEmailPayload['type'], string> = {
    date_created:   `💌 ${fromName} planejou um date especial para vocês!`,
    date_confirmed: `✅ Date confirmado: ${dateTitle}`,
    date_changed:   `📅 Data do date "${dateTitle}" foi atualizada`,
    date_cancelled: `🚫 Date "${dateTitle}" foi cancelado`,
  }

  const HEADINGS: Record<SendEmailPayload['type'], string> = {
    date_created:   '💌 Novo date planejado!',
    date_confirmed: '✅ Date confirmado!',
    date_changed:   '📅 Data atualizada',
    date_cancelled: '🚫 Date cancelado',
  }

  const INTROS: Record<SendEmailPayload['type'], string> = {
    date_created:   `${fromName} planejou um date especial para vocês. Confira os detalhes abaixo e adicione ao seu calendário!`,
    date_confirmed: `Boa notícia! ${fromName} confirmou o date. Marque na agenda e prepare-se!`,
    date_changed:   `${fromName} atualizou a data ou horário do date. Verifique os novos detalhes abaixo.`,
    date_cancelled: `Infelizmente ${fromName} precisou cancelar o date. Fique de olho para novidades em breve!`,
  }

  const detailRows: string[] = []
  if (dateTitle && type !== 'date_cancelled') {
    detailRows.push(`<tr><td style="padding:8px 0;color:#57606a;font-size:13px;width:90px">Título</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#1f2328">${dateTitle}</td></tr>`)
  }
  if (dateFormatted) {
    detailRows.push(`<tr><td style="padding:8px 0;color:#57606a;font-size:13px">Data</td><td style="padding:8px 0;font-size:14px;color:#1f2328">${dateFormatted}</td></tr>`)
  }
  if (time) {
    detailRows.push(`<tr><td style="padding:8px 0;color:#57606a;font-size:13px">Horário</td><td style="padding:8px 0;font-size:14px;color:#1f2328">${time}</td></tr>`)
  }
  if (location && type !== 'date_cancelled') {
    detailRows.push(`<tr><td style="padding:8px 0;color:#57606a;font-size:13px">Local</td><td style="padding:8px 0;font-size:14px;color:#1f2328">${location}</td></tr>`)
  }

  const ctaButton = shareUrl && type !== 'date_cancelled'
    ? `<a href="${shareUrl}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#1f2328;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Ver detalhes do date →</a>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:-apple-system,'Segoe UI',system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
      <!-- Header -->
      <tr><td style="background:#1f2328;padding:24px 32px">
        <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">DateFlow</span>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1f2328">${HEADINGS[type]}</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#57606a;line-height:1.6">
          Olá, <strong>${toName}</strong>! ${INTROS[type]}
        </p>
        ${detailRows.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;background:#f7f8fa;border-radius:8px;padding:8px 16px;border:1px solid #e5e7eb">
          <tr><td colspan="2" style="padding:12px 0 0">
            <table style="width:100%;padding:0 12px">${detailRows.join('')}</table>
          </td></tr>
          <tr><td style="height:12px"></td></tr>
        </table>` : ''}
        ${ctaButton}
        <p style="margin:32px 0 0;font-size:12px;color:#57606a;border-top:1px solid #e5e7eb;padding-top:16px">
          Este e-mail foi enviado pelo <strong>DateFlow</strong> porque ${fromName} te adicionou em um date.<br>
          ${shareUrl ? `Se o arquivo .ics não abrir automaticamente, você pode <a href="${shareUrl}" style="color:#3b82d4">ver o date aqui</a>.` : ''}
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

  return { subject: SUBJECTS[type], html }
}

// ─── Cloud Function: sendPushNotification ─────────────────────────────────────

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

    // Validação do payload: campos obrigatórios e tipo válido
    if (!data.toUserId || !data.type) {
      throw new HttpsError('invalid-argument', 'Payload inválido.')
    }
    if (!(data.type in LABELS)) {
      throw new HttpsError('invalid-argument', 'Tipo de notificação inválido.')
    }

    // Para notificações relacionadas a dates, verifica que o date pertence ao chamador
    const dateRelatedTypes: NotificationType[] = [
      'date_accepted', 'date_declined', 'date_cancelled', 'date_changed',
      'date_created', 'date_confirmed', 'date_done', 'partner_note', 'partner_rated',
    ]
    if (data.dateId && dateRelatedTypes.includes(data.type)) {
      const dateSnap = await db.collection('dates').doc(data.dateId).get()
      if (!dateSnap.exists) {
        throw new HttpsError('not-found', 'Date não encontrado.')
      }
      const dateData = dateSnap.data() as { userId: string; withPartnerId?: string }
      const isOwner   = dateData.userId === request.auth.uid
      const isPartner = dateData.withPartnerId === request.auth.uid
      if (!isOwner && !isPartner) {
        throw new HttpsError('permission-denied', 'Sem acesso a este date.')
      }
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

// ─── Cloud Function: sendEmailInvite ─────────────────────────────────────────

/**
 * Envia um e-mail de notificação + anexo .ics para a parceira/parceiro.
 *
 * Secrets necessários (configurar via Firebase CLI):
 *   firebase functions:secrets:set SMTP_HOST
 *   firebase functions:secrets:set SMTP_PORT   (ex: "587")
 *   firebase functions:secrets:set SMTP_USER   (seu e-mail SMTP)
 *   firebase functions:secrets:set SMTP_PASS   (senha/app-password)
 *   firebase functions:secrets:set SMTP_FROM   (ex: "DateFlow <noreply@seudominio.com>")
 *
 * O cliente chama com: httpsCallable(functions, 'sendEmailInvite')(payload)
 */
export const sendEmailInvite = onCall(
  {
    region: 'southamerica-east1',
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Autenticação necessária.')
    }

    const data = request.data as SendEmailPayload

    if (!data.dateId || !data.toEmail || !data.type) {
      throw new HttpsError('invalid-argument', 'Campos obrigatórios ausentes.')
    }

    // Busca o date no Firestore para garantir que os dados são verídicos
    const dateSnap = await db.collection('dates').doc(data.dateId).get()
    if (!dateSnap.exists) {
      throw new HttpsError('not-found', 'Date não encontrado.')
    }
    const dateDoc = dateSnap.data() as {
      title: string; date: string; time: string; location?: string
      description?: string; hiddenFromPartner?: boolean; shareToken?: string
      userId: string
    }

    // Apenas o dono do date pode enviar o convite
    if (dateDoc.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Apenas o criador do date pode enviar convites.')
    }

    // Título visível — respeita hiddenFromPartner
    const visibleTitle = dateDoc.hiddenFromPartner ? 'Surpresa especial 🎁' : dateDoc.title

    // Link público
    const shareUrl = data.shareUrl
      ?? (dateDoc.shareToken ? `https://dateflow.app/share/${dateDoc.shareToken}` : undefined)

    // Monta o .ics
    const icsContent = buildIcs({
      uid: data.dateId,
      title: visibleTitle,
      date: dateDoc.date,
      time: dateDoc.time,
      location: dateDoc.hiddenFromPartner ? undefined : dateDoc.location,
      description: dateDoc.hiddenFromPartner
        ? (shareUrl ? `Ver dicas: ${shareUrl}` : undefined)
        : [dateDoc.description, shareUrl ? `Ver detalhes: ${shareUrl}` : ''].filter(Boolean).join('\n'),
      organizer: {
        name: data.fromName,
        email: request.auth.token.email ?? SMTP_USER.value(),
      },
      attendeeEmail: data.toEmail,
    })

    // Monta o HTML do e-mail
    const { subject, html } = buildEmailHtml({
      toName:         data.toName,
      fromName:       data.fromName,
      type:           data.type,
      dateTitle:      visibleTitle,
      dateFormatted:  data.type !== 'date_cancelled' ? fmtDate(dateDoc.date) : undefined,
      time:           data.type !== 'date_cancelled' ? dateDoc.time : undefined,
      location:       !dateDoc.hiddenFromPartner ? dateDoc.location : undefined,
      shareUrl,
    })

    // Cria o transporter Nodemailer com as credenciais dos secrets
    // secure=true (TLS implícito) para porta 465; requireTLS=true (STARTTLS obrigatório) para 587
    const smtpPort = Number(SMTP_PORT.value())
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST.value(),
      port: smtpPort,
      secure: smtpPort === 465,
      requireTLS: smtpPort === 587,
      auth: {
        user: SMTP_USER.value(),
        pass: SMTP_PASS.value(),
      },
    })

    await transporter.sendMail({
      from:    SMTP_FROM.value(),
      to:      `"${data.toName}" <${data.toEmail}>`,
      subject,
      html,
      // .ics como anexo — clientes de e-mail como Gmail e Apple Mail abrem automaticamente
      attachments: [
        {
          filename:    'convite-date.ics',
          content:     icsContent,
          contentType: 'text/calendar; method=REQUEST; charset=UTF-8',
        },
      ],
    })

    return { sent: true }
  }
)
