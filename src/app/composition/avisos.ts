import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { avisoDeAgenda } from '@/modules/notifications'
import { avisarAlAdmin, avisarDelEvento } from '@/modules/notifications/application/avisos'
import { drizzleAvisos } from '@/modules/notifications/infrastructure/drizzle-avisos'
import { createWebPushSender } from '@/modules/notifications/infrastructure/web-push-sender'
import { BRAND } from '@/shared/config/brand'
import { env } from '@/shared/config/env'

// Uno por proceso: `web-push` firma con estas claves en cada envío.
const emisor = createWebPushSender({ publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: `mailto:${BRAND.email}` })
const deps = { store: drizzleAvisos, emisor }

/**
 * **Los avisos del panel**: la campana y las notificaciones push web (Android, iPhone con el panel
 * instalado, computadoras). Avisar nunca lanza: se llama en `after()`, con la respuesta ya enviada.
 */
export const avisos = {
  delEvento: avisarDelEvento(deps),
  alAdmin: avisarAlAdmin(deps),
  listar: (userId: string) => drizzleAvisos.listar(userId, 30),
  sinVer: (userId: string) => drizzleAvisos.sinVer(userId),
  marcarVistos: (userId: string) => drizzleAvisos.marcarVistos(userId),
  suscribir: drizzleAvisos.suscribir,
  desuscribir: drizzleAvisos.desuscribir,
  cuantosAparatos: drizzleAvisos.cuantosAparatos,
  silenciados: drizzleAvisos.silenciados,
  silenciar: drizzleAvisos.silenciar,
  /** La clave pública para suscribirse, o `null` si las push están apagadas. */
  clavePublica: emisor.disponible ? (env.VAPID_PUBLIC_KEY ?? null) : null,
  /** Un aviso de prueba a los aparatos de la persona, para comprobar que llegan. */
  probar: async (userId: string) => {
    const aparatos = await drizzleAvisos.aparatosDe([userId])
    const r = await Promise.all(aparatos.map((a) => emisor.enviar(a, { title: 'Los avisos funcionan', body: 'Así te llegarán las novedades de tus eventos.', url: '/panel', tag: 'prueba' })))
    for (const [i, estado] of r.entries()) if (estado === 'caducada') await drizzleAvisos.olvidarAparato(aparatos[i]!.id)
    return { aparatos: aparatos.length, entregados: r.filter((x) => x === 'ok').length }
  },
}

const masDias = (iso: string, dias: number): string => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/**
 * **Lo que vence**, del mantenimiento diario: tareas y pagos de mañana, y la semana y la víspera del
 * evento. Cada aviso una sola vez por día aunque el mantenimiento corra dos veces. Devuelve cuántos salieron.
 */
export async function avisarLoQueVence(ahora: Date): Promise<number> {
  const hoy = fechaEnBolivia(ahora)
  const manana = masDias(hoy, 1)
  const candidatos: { eventId: string; que: string; cuando: string; ruta: string }[] = [
    ...(await drizzleAvisos.vencenEl(manana)).map((v) => ({ ...v, cuando: 'mañana' })),
    ...(await drizzleAvisos.eventosDel(manana)).map((eventId) => ({ eventId, que: 'es tu evento', cuando: 'mañana', ruta: '' })),
    ...(await drizzleAvisos.eventosDel(masDias(hoy, 7))).map((eventId) => ({ eventId, que: 'tu evento', cuando: 'en 7 días', ruta: '' })),
  ]
  let enviados = 0
  for (const c of candidatos) {
    const salio = await avisos.delEvento(c.eventId, (ev) => avisoDeAgenda({ ...ev, que: c.que, cuando: c.cuando, ruta: c.ruta }), { unaVezAlDia: true })
    if (salio) enviados += 1
  }
  return enviados
}
