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
exports.sendPushNotification = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
const db = admin.firestore();
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
};
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
    // Validação básica do payload
    if (!data.toUserId || !data.type || !data.dateId) {
        throw new https_1.HttpsError('invalid-argument', 'Payload inválido.');
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
//# sourceMappingURL=index.js.map