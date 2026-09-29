import { cargaPush, destinatariosDelEvento, leEnviamosPush, type Aviso, type CargaPush } from '../domain/avisos'

/** Un aparato con las push activadas, con lo que su dueño tiene silenciado. */
export type AparatoPush = {
  readonly id: string
  readonly userId: string
  readonly endpoint: string
  readonly p256dh: string
  readonly auth: string
  readonly silenciados: readonly string[]
}

type Persona = { readonly userId: string; readonly role: string }

export interface AvisosStore {
  /** Título, dirección y quiénes llevan el evento. `null` si no existe. */
  delEvento(eventId: string): Promise<{ titulo: string; slug: string; dueno: Persona | null; equipo: readonly (Persona & { membership: string })[] } | null>
  admins(): Promise<string[]>
  crear(filas: readonly { userId: string; eventId: string | null; aviso: Aviso }[]): Promise<void>
  aparatosDe(userIds: readonly string[]): Promise<AparatoPush[]>
  olvidarAparato(id: string): Promise<void>
  aparatoUsado(id: string): Promise<void>
  /** Si ese aviso ya salió hoy para el evento (los del mantenimiento, que puede correr dos veces). */
  yaAvisado(eventId: string, titulo: string): Promise<boolean>
}

/**
 * Quien entrega la push. `caducada`: el servicio dijo que ese aparato ya no existe (404/410) y se
 * borra; `error`: un fallo pasajero, se deja. `disponible` es falso sin claves VAPID.
 */
export interface EmisorPush {
  readonly disponible: boolean
  enviar(aparato: AparatoPush, carga: CargaPush): Promise<'ok' | 'caducada' | 'error'>
}

type Deps = { store: AvisosStore; emisor: EmisorPush }

async function entregar(deps: Deps, userIds: readonly string[], eventId: string | null, aviso: Aviso): Promise<void> {
  if (userIds.length === 0) return
  // La campana primero: aunque la push falle, el aviso queda.
  await deps.store.crear(userIds.map((userId) => ({ userId, eventId, aviso })))
  if (!deps.emisor.disponible) return
  const carga = cargaPush(aviso, eventId)
  const aparatos = (await deps.store.aparatosDe(userIds)).filter((a) => leEnviamosPush(a.silenciados, aviso.kind))
  await Promise.all(
    aparatos.map(async (a) => {
      const r = await deps.emisor.enviar(a, carga)
      if (r === 'caducada') await deps.store.olvidarAparato(a.id)
      else if (r === 'ok') await deps.store.aparatoUsado(a.id)
    }),
  )
}

/**
 * Avisa a quienes llevan el evento. `construir` recibe su título y dirección y devuelve el aviso.
 * **Nunca lanza**: corre después de responder (`after`) y un aviso no puede tumbar una confirmación.
 */
export const avisarDelEvento =
  (deps: Deps) =>
  async (eventId: string, construir: (evento: { titulo: string; slug: string }) => Aviso, opciones: { unaVezAlDia?: boolean } = {}): Promise<boolean> => {
    try {
      const evento = await deps.store.delEvento(eventId)
      if (evento === null) return false
      const aviso = construir({ titulo: evento.titulo, slug: evento.slug })
      if (opciones.unaVezAlDia && (await deps.store.yaAvisado(eventId, aviso.title))) return false
      await entregar(deps, destinatariosDelEvento(evento), eventId, aviso)
      return true
    } catch (causa) {
      console.error('no se pudo avisar del evento %s:', eventId, causa)
      return false
    }
  }

/** Avisa a cada admin (consultas, comprobantes). Nunca lanza. */
export const avisarAlAdmin =
  (deps: Deps) =>
  async (aviso: Aviso): Promise<void> => {
    try {
      await entregar(deps, await deps.store.admins(), null, aviso)
    } catch (causa) {
      console.error('no se pudo avisar al admin:', causa)
    }
  }
