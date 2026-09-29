import webpush, { WebPushError } from 'web-push'
import type { CargaPush } from '../domain/avisos'
import type { AparatoPush, EmisorPush } from '../application/avisos'
import { registrarFallo } from '@/shared/observability/fallos'

/**
 * Entrega las notificaciones push web con `web-push`, que firma con VAPID y cifra el contenido
 * (aes128gcm) para el servicio de push del navegador: FCM en Android y Chrome, el de Apple en
 * iPhone y Safari, el de Mozilla en Firefox.
 *
 * **Sin claves no envía** y lo dice una vez: la campana sigue funcionando.
 * Solo en Node (usa `crypto`): nunca en el runtime de Edge.
 */
export function createWebPushSender(config: { publicKey: string | undefined; privateKey: string | undefined; subject: string }): EmisorPush {
  const disponible = Boolean(config.publicKey && config.privateKey)
  if (!disponible) console.warn('notificaciones push apagadas: faltan VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY')
  const detalles = disponible ? { subject: config.subject, publicKey: config.publicKey as string, privateKey: config.privateKey as string } : null

  return {
    disponible,
    async enviar(aparato: AparatoPush, carga: CargaPush) {
      if (detalles === null) return 'error'
      try {
        await webpush.sendNotification(
          { endpoint: aparato.endpoint, keys: { p256dh: aparato.p256dh, auth: aparato.auth } },
          JSON.stringify(carga),
          // Un día: si el aparato está apagado, al encenderlo todavía vale; más tarde ya no importa.
          // `high`: en Android, `normal` puede esperar a que el teléfono salga del reposo.
          { vapidDetails: detalles, TTL: 86_400, urgency: 'high', topic: topicDe(carga.tag) },
        )
        return 'ok'
      } catch (causa) {
        // 404 y 410: el aparato se dio de baja o caducó. Hay que olvidarlo, o cada aviso lo reintenta.
        if (causa instanceof WebPushError && (causa.statusCode === 404 || causa.statusCode === 410)) return 'caducada'
        registrarFallo('notifications/web-push-sender', 'push no entregada a %s:', new URL(aparato.endpoint).host, causa instanceof WebPushError ? causa.statusCode : causa)
        return 'error'
      }
    },
  }
}

/**
 * El `Topic` de la push (RFC 8030): el servicio sustituye la que aún no entregó por la nueva del mismo
 * tema. Solo admite base64url y hasta 32 caracteres.
 */
export const topicDe = (tag: string): string => tag.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 32)
