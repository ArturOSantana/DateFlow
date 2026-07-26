"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailNotification = exports.sendEmailInvite = exports.sendPushNotification = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const nodemailer = __importStar(require("nodemailer"));
admin.initializeApp();
const db = admin.firestore();
// ─── Secrets (definidos via: firebase functions:secrets:set SMTP_USER) ────────
const SMTP_HOST = (0, params_1.defineSecret)('SMTP_HOST');
const SMTP_PORT = (0, params_1.defineSecret)('SMTP_PORT');
const SMTP_USER = (0, params_1.defineSecret)('SMTP_USER');
const SMTP_PASS = (0, params_1.defineSecret)('SMTP_PASS');
const SMTP_FROM = (0, params_1.defineSecret)('SMTP_FROM'); // ex: "DateFlow <noreply@seudominio.com>"
// ─── Labels para push ─────────────────────────────────────────────────────────
const LABELS = {
    date_accepted: {
        title: '💚 Date aceito!',
        body: (from, title) => `${from} aceitou o date "${title}"`,
    },
    date_declined: {
        title: '❌ Date recusado',
        body: (from, title, reason) => reason ? `${from} recusou "${title}": ${reason}` : `${from} recusou o date "${title}"`,
    },
    date_cancelled: {
        title: '🚫 Date cancelado',
        body: (from, title, reason) => reason ? `${from} cancelou "${title}": ${reason}` : `${from} cancelou o date "${title}"`,
    },
    date_changed: {
        title: '📅 Date alterado',
        body: (from, title, extra) => extra ? `${from} alterou "${title}" para ${extra}` : `${from} alterou o date "${title}"`,
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
        body: (from, _, reason) => reason ? `${from} recusou o convite: ${reason}` : `${from} recusou seu convite de parceria`,
    },
    partner_note: {
        title: '📝 Nova observação',
        body: (from, title) => `${from} deixou uma observação no date "${title}"`,
    },
    partner_rated: {
        title: '⭐ Avaliação recebida',
        body: (from, title, extra) => extra ? `${from} avaliou "${title}" com ${extra}` : `${from} avaliou o date "${title}"`,
    },
};
// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Formata data ISO (yyyy-MM-dd) para exibição humana em pt-BR */
function fmtDate(iso) {
    try {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
    }
    catch {
        return iso;
    }
}
/** Gera conteúdo iCalendar (.ics) compatível com RFC 5545 */
function buildIcs(params) {
    const [year, month, day] = params.date.split('-').map(Number);
    const [hour, minute] = params.time.split(':').map(Number);
    const pad = (n) => String(n).padStart(2, '0');
    const dtStart = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
    const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(hour + 2)}${pad(minute)}00`;
    const now = new Date();
    const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
    const fold = (v) => {
        const escaped = v
            .replace(/\\/g, '\\\\').replace(/;/g, '\\;')
            .replace(/,/g, '\\,').replace(/\n/g, '\\n');
        let out = '';
        let rem = escaped;
        while (rem.length > 75) {
            out += rem.slice(0, 75) + '\r\n ';
            rem = rem.slice(75);
        }
        return out + rem;
    };
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
    ];
    if (params.location)
        lines.push(`LOCATION:${fold(params.location)}`);
    if (params.description)
        lines.push(`DESCRIPTION:${fold(params.description)}`);
    if (params.attendeeEmail) {
        lines.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${params.attendeeEmail}`);
    }
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.join('\r\n');
}
/** Monta o HTML do e-mail de acordo com o tipo de notificação */
function buildEmailHtml(params) {
    const { toName, fromName, type, dateTitle, dateFormatted, time, location, shareUrl } = params;
    const SUBJECTS = {
        date_created: `💌 ${fromName} planejou um date especial para vocês!`,
        date_confirmed: `✅ Date confirmado: ${dateTitle}`,
        date_changed: `📅 Data do date "${dateTitle}" foi atualizada`,
        date_cancelled: `🚫 Date "${dateTitle}" foi cancelado`,
    };
    const HEADINGS = {
        date_created: '💌 Novo date planejado!',
        date_confirmed: '✅ Date confirmado!',
        date_changed: '📅 Data atualizada',
        date_cancelled: '🚫 Date cancelado',
    };
    const INTROS = {
        date_created: `${fromName} planejou um date especial para vocês. Confira os detalhes abaixo e adicione ao seu calendário!`,
        date_confirmed: `Boa notícia! ${fromName} confirmou o date. Marque na agenda e prepare-se!`,
        date_changed: `${fromName} atualizou a data ou horário do date. Verifique os novos detalhes abaixo.`,
        date_cancelled: `Infelizmente ${fromName} precisou cancelar o date. Fique de olho para novidades em breve!`,
    };
    const detailRows = [];
    if (dateTitle && type !== 'date_cancelled') {
        detailRows.push(`<tr><td style="padding:8px 0;color:#57606a;font-size:13px;width:90px">Título</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#1f2328">${dateTitle}</td></tr>`);
    }
    if (dateFormatted) {
        detailRows.push(`<tr><td style="padding:8px 0;color:#57606a;font-size:13px">Data</td><td style="padding:8px 0;font-size:14px;color:#1f2328">${dateFormatted}</td></tr>`);
    }
    if (time) {
        detailRows.push(`<tr><td style="padding:8px 0;color:#57606a;font-size:13px">Horário</td><td style="padding:8px 0;font-size:14px;color:#1f2328">${time}</td></tr>`);
    }
    if (location && type !== 'date_cancelled') {
        detailRows.push(`<tr><td style="padding:8px 0;color:#57606a;font-size:13px">Local</td><td style="padding:8px 0;font-size:14px;color:#1f2328">${location}</td></tr>`);
    }
    const ctaButton = shareUrl && type !== 'date_cancelled'
        ? `<a href="${shareUrl}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#1f2328;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Ver detalhes do date →</a>`
        : '';
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
</html>`;
    return { subject: SUBJECTS[type], html };
}
// ─── Cloud Function: sendPushNotification ─────────────────────────────────────
/**
 * Callable function: recebe o payload de notificação do cliente,
 * busca os FCM tokens do destinatário no Firestore e envia via FCM v1 API.
 *
 * O cliente chama com: httpsCallable(functions, 'sendPushNotification')(payload)
 * A autenticação é validada automaticamente pelo Firebase Functions.
 */
exports.sendPushNotification = (0, https_1.onCall)({ region: 'southamerica-east1' }, async (request) => {
    // Garante que apenas usuários autenticados chamem a função
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticação necessária.');
    }
    const data = request.data;
    // Validação do payload: campos obrigatórios e tipo válido
    if (!data.toUserId || !data.type) {
        throw new https_1.HttpsError('invalid-argument', 'Payload inválido.');
    }
    if (!(data.type in LABELS)) {
        throw new https_1.HttpsError('invalid-argument', 'Tipo de notificação inválido.');
    }
    // Para notificações relacionadas a dates, verifica que o date pertence ao chamador
    const dateRelatedTypes = [
        'date_accepted', 'date_declined', 'date_cancelled', 'date_changed',
        'date_created', 'date_confirmed', 'date_done', 'partner_note', 'partner_rated',
    ];
    if (data.dateId && dateRelatedTypes.includes(data.type)) {
        const dateSnap = await db.collection('dates').doc(data.dateId).get();
        if (!dateSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Date não encontrado.');
        }
        const dateData = dateSnap.data();
        const isOwner = dateData.userId === request.auth.uid;
        const isPartner = dateData.withPartnerId === request.auth.uid;
        if (!isOwner && !isPartner) {
            throw new https_1.HttpsError('permission-denied', 'Sem acesso a este date.');
        }
    }
    // Busca todos os FCM tokens do destinatário
    const snap = await db
        .collection('fcmTokens')
        .where('userId', '==', data.toUserId)
        .get();
    if (snap.empty)
        return { sent: 0 };
    const tokens = snap.docs.map(d => d.data().token);
    // Monta texto da notificação
    const label = LABELS[data.type];
    let extra;
    if (data.type === 'date_changed' && (data.dateValue || data.timeValue)) {
        const parts = [];
        if (data.dateValue) {
            parts.push(new Date(`${data.dateValue}T12:00:00`).toLocaleDateString('pt-BR'));
        }
        if (data.timeValue)
            parts.push(`às ${data.timeValue}`);
        extra = parts.join(' ');
    }
    else if (data.type === 'partner_rated' && data.rating) {
        extra = `${data.rating} ⭐`;
    }
    else if (data.reason) {
        extra = data.reason;
    }
    const title = label.title;
    const body = label.body(data.fromName, data.dateTitle, extra);
    const url = `/dates/${data.dateId}`;
    // Envia para todos os dispositivos do destinatário via FCM v1 API
    const messaging = admin.messaging();
    const results = await Promise.allSettled(tokens.map(token => messaging.send({
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
    })));
    // Remove tokens inválidos/expirados do Firestore
    const expiredTokens = [];
    results.forEach((result, i) => {
        if (result.status === 'rejected' &&
            (result.reason?.errorInfo?.code === 'messaging/registration-token-not-registered' ||
                result.reason?.errorInfo?.code === 'messaging/invalid-registration-token')) {
            expiredTokens.push(tokens[i]);
        }
    });
    if (expiredTokens.length > 0) {
        const batch = db.batch();
        for (const token of expiredTokens) {
            const id = `${data.toUserId}_${token.slice(-16)}`;
            batch.delete(db.doc(`fcmTokens/${id}`));
        }
        await batch.commit();
    }
    const sent = results.filter(r => r.status === 'fulfilled').length;
    return { sent };
});
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
exports.sendEmailInvite = (0, https_1.onCall)({
    region: 'southamerica-east1',
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM],
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticação necessária.');
    }
    const data = request.data;
    if (!data.dateId || !data.toEmail || !data.type) {
        throw new https_1.HttpsError('invalid-argument', 'Campos obrigatórios ausentes.');
    }
    // Busca o date no Firestore para garantir que os dados são verídicos
    const dateSnap = await db.collection('dates').doc(data.dateId).get();
    if (!dateSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Date não encontrado.');
    }
    const dateDoc = dateSnap.data();
    // Apenas o dono do date pode enviar o convite
    if (dateDoc.userId !== request.auth.uid) {
        throw new https_1.HttpsError('permission-denied', 'Apenas o criador do date pode enviar convites.');
    }
    // Título visível — respeita hiddenFromPartner
    const visibleTitle = dateDoc.hiddenFromPartner ? 'Surpresa especial 🎁' : dateDoc.title;
    // Link público
    const shareUrl = data.shareUrl
        ?? (dateDoc.shareToken ? `https://dateflow.app/share/${dateDoc.shareToken}` : undefined);
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
    });
    // Monta o HTML do e-mail
    const { subject, html } = buildEmailHtml({
        toName: data.toName,
        fromName: data.fromName,
        type: data.type,
        dateTitle: visibleTitle,
        dateFormatted: data.type !== 'date_cancelled' ? fmtDate(dateDoc.date) : undefined,
        time: data.type !== 'date_cancelled' ? dateDoc.time : undefined,
        location: !dateDoc.hiddenFromPartner ? dateDoc.location : undefined,
        shareUrl,
    });
    // Cria o transporter Nodemailer com as credenciais dos secrets
    // secure=true (TLS implícito) para porta 465; requireTLS=true (STARTTLS obrigatório) para 587
    const smtpPort = Number(SMTP_PORT.value());
    const transporter = nodemailer.createTransport({
        host: SMTP_HOST.value(),
        port: smtpPort,
        secure: smtpPort === 465,
        requireTLS: smtpPort === 587,
        auth: {
            user: SMTP_USER.value(),
            pass: SMTP_PASS.value(),
        },
    });
    await transporter.sendMail({
        from: SMTP_FROM.value(),
        to: `"${data.toName}" <${data.toEmail}>`,
        subject,
        html,
        // .ics como anexo — clientes de e-mail como Gmail e Apple Mail abrem automaticamente
        attachments: [
            {
                filename: 'convite-date.ics',
                content: icsContent,
                contentType: 'text/calendar; method=REQUEST; charset=UTF-8',
            },
        ],
    });
    return { sent: true };
});
function buildNotificationEmailHtml(params) {
    const { toName, fromName, type, dateTitle, dateFormatted, time, reason, rating, shareUrl } = params;
    const SUBJECTS = {
        date_accepted: `💚 ${fromName} aceitou o date "${dateTitle}"`,
        date_declined: `❌ ${fromName} recusou o date "${dateTitle}"`,
        date_cancelled: `🚫 Date "${dateTitle}" foi cancelado`,
        date_changed: `📅 Data do date "${dateTitle}" foi atualizada`,
        date_created: `🆕 ${fromName} planejou um novo date: "${dateTitle}"`,
        date_confirmed: `✅ Date "${dateTitle}" confirmado!`,
        date_done: `🎉 Date "${dateTitle}" realizado! Como foi?`,
        invite_accepted: `🤝 ${fromName} aceitou seu convite de parceria`,
        invite_rejected: `💔 ${fromName} recusou seu convite de parceria`,
        partner_note: `📝 ${fromName} deixou uma observação no date "${dateTitle}"`,
        partner_rated: `⭐ ${fromName} avaliou o date "${dateTitle}"`,
    };
    const HEADINGS = {
        date_accepted: '💚 Date aceito!',
        date_declined: '❌ Date recusado',
        date_cancelled: '🚫 Date cancelado',
        date_changed: '📅 Data atualizada',
        date_created: '🆕 Novo date planejado!',
        date_confirmed: '✅ Date confirmado!',
        date_done: '🎉 Date realizado!',
        invite_accepted: '🤝 Convite aceito!',
        invite_rejected: '💔 Convite recusado',
        partner_note: '📝 Nova observação',
        partner_rated: '⭐ Avaliação recebida',
    };
    const INTROS = {
        date_accepted: `${fromName} aceitou o date e está animado(a)! O date foi marcado como confirmado.`,
        date_declined: reason
            ? `${fromName} recusou o date "${dateTitle}". Motivo: ${reason}`
            : `${fromName} recusou o date "${dateTitle}".`,
        date_cancelled: reason
            ? `${fromName} precisou cancelar o date "${dateTitle}". Motivo: ${reason}`
            : `${fromName} cancelou o date "${dateTitle}".`,
        date_changed: `${fromName} atualizou a data ou horário do date "${dateTitle}". Verifique os novos detalhes.`,
        date_created: `${fromName} planejou um date especial para vocês. Confira os detalhes e adicione ao seu calendário!`,
        date_confirmed: `Boa notícia! ${fromName} confirmou o date "${dateTitle}". Marque na agenda!`,
        date_done: `${fromName} marcou o date "${dateTitle}" como realizado. Como foi para você? Entre no app para deixar sua avaliação!`,
        invite_accepted: `${fromName} aceitou seu convite de parceria! Agora vocês podem planejar dates juntos(as).`,
        invite_rejected: reason
            ? `${fromName} recusou seu convite de parceria. Motivo: ${reason}`
            : `${fromName} recusou seu convite de parceria.`,
        partner_note: `${fromName} deixou uma observação no date "${dateTitle}". Confira no app!`,
        partner_rated: rating
            ? `${fromName} avaliou o date "${dateTitle}" com ${'⭐'.repeat(rating)} (${rating}/5).`
            : `${fromName} avaliou o date "${dateTitle}". Confira no app!`,
    };
    const detailRows = [];
    if (dateTitle && !['invite_accepted', 'invite_rejected'].includes(type)) {
        detailRows.push(`<tr><td style="padding:8px 0;color:#57606a;font-size:13px;width:90px">Título</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#1f2328">${dateTitle}</td></tr>`);
    }
    if (dateFormatted) {
        detailRows.push(`<tr><td style="padding:8px 0;color:#57606a;font-size:13px">Data</td><td style="padding:8px 0;font-size:14px;color:#1f2328">${dateFormatted}</td></tr>`);
    }
    if (time) {
        detailRows.push(`<tr><td style="padding:8px 0;color:#57606a;font-size:13px">Horário</td><td style="padding:8px 0;font-size:14px;color:#1f2328">${time}</td></tr>`);
    }
    if (rating) {
        detailRows.push(`<tr><td style="padding:8px 0;color:#57606a;font-size:13px">Avaliação</td><td style="padding:8px 0;font-size:14px;color:#1f2328">${'⭐'.repeat(rating)} (${rating}/5)</td></tr>`);
    }
    const ctaButton = shareUrl && dateTitle
        ? `<a href="${shareUrl}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#1f2328;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Ver date no app →</a>`
        : '';
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:-apple-system,'Segoe UI',system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
      <tr><td style="background:#1f2328;padding:24px 32px">
        <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">DateFlow</span>
      </td></tr>
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
          Este e-mail foi enviado pelo <strong>DateFlow</strong> porque você tem uma parceria ativa.<br>
          ${shareUrl ? `<a href="${shareUrl}" style="color:#3b82d4">Abrir no DateFlow</a>` : ''}
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
    return { subject: SUBJECTS[type], html };
}
exports.sendEmailNotification = (0, https_1.onCall)({
    region: 'southamerica-east1',
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM],
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticação necessária.');
    }
    const data = request.data;
    if (!data.toUserId || !data.type || !data.fromName) {
        throw new https_1.HttpsError('invalid-argument', 'Campos obrigatórios ausentes.');
    }
    if (!(data.type in LABELS)) {
        throw new https_1.HttpsError('invalid-argument', 'Tipo de notificação inválido.');
    }
    // Busca o e-mail do destinatário via Firebase Auth Admin
    let toEmail;
    let toName;
    try {
        const userRecord = await admin.auth().getUser(data.toUserId);
        if (!userRecord.email)
            return { sent: false, reason: 'no_email' };
        toEmail = userRecord.email;
        toName = data.toName || userRecord.displayName || userRecord.email;
    }
    catch {
        return { sent: false, reason: 'user_not_found' };
    }
    // Formata a data se fornecida
    const dateFormatted = data.dateValue ? fmtDate(data.dateValue) : undefined;
    // Monta o HTML do e-mail
    const { subject, html } = buildNotificationEmailHtml({
        toName,
        fromName: data.fromName,
        type: data.type,
        dateTitle: data.dateTitle,
        dateFormatted,
        time: data.timeValue,
        reason: data.reason,
        rating: data.rating,
        shareUrl: data.shareUrl,
    });
    // Cria o transporter com TLS
    const smtpPort = Number(SMTP_PORT.value());
    const transporter = nodemailer.createTransport({
        host: SMTP_HOST.value(),
        port: smtpPort,
        secure: smtpPort === 465,
        requireTLS: smtpPort === 587,
        auth: {
            user: SMTP_USER.value(),
            pass: SMTP_PASS.value(),
        },
    });
    await transporter.sendMail({
        from: SMTP_FROM.value(),
        to: `"${toName}" <${toEmail}>`,
        subject,
        html,
    });
    return { sent: true };
});
//# sourceMappingURL=index.js.map