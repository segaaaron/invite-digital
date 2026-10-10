import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { avisosDeLaAgenda } from '@/modules/planner'
import { registrarFallo } from '@/shared/observability/fallos'
import { isErr } from '@/shared/result'
import { events, planner } from './eventos'
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

/**
 * **Los avisos de la agenda**, del mantenimiento de cada mañana (9 oct): de cada evento por venir, lo que
 * dice `avisosDeLaAgenda` —el resumen de hoy, lo de mañana (también citas, ensayos y el cierre de
 * confirmaciones), lo que venció ayer y la cuenta del evento—. Cada aviso una sola vez por día aunque el
 * mantenimiento corra dos veces. Un evento que falla no corta a los demás. Devuelve cuántos salieron.
 */
// ponytail: todos los del equipo reciben todo; por responsable de cada tarea, si el equipo crece.
export async function avisarLoQueVence(ahora: Date): Promise<number> {
  const hoy = fechaEnBolivia(ahora)
  const ids = await drizzleAvisos.eventosConAvisos(hoy)
  const deUno = async (eventId: string): Promise<number> => {
    try {
      const evento = await events.getByIdUnscoped(eventId)
      if (isErr(evento)) return 0
      let salieron = 0
      for (const a of avisosDeLaAgenda(await planner.dia.agenda(evento.value), hoy)) {
        if (await avisos.delEvento(eventId, (ev) => avisoDeAgenda({ ...ev, ...a }), { unaVezAlDia: true })) salieron += 1
      }
      return salieron
    } catch (causa) {
      registrarFallo('avisos/agenda', 'no se pudieron preparar los avisos de la agenda de un evento', causa)
      return 0
    }
  }
  // De cinco en cinco: sin abrir de golpe tantas consultas como eventos haya.
  let enviados = 0
  for (let i = 0; i < ids.length; i += 5) enviados += (await Promise.all(ids.slice(i, i + 5).map(deUno))).reduce((s, n) => s + n, 0)
  return enviados
}
