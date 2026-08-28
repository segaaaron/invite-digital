import {
  type InvitationContent,
  type SectionKey,
  mergeContent,
  parseInvitationContent,
} from '../domain/invitation-content'
import type { ContentRepository } from './ports'

/**
 * El contenido con el que se pinta la invitación.
 *
 * **No escribe, y no fusiona.** Devuelve lo que el evento tiene guardado, tal cual.
 *
 * Fusionar en cada lectura dejaría la invitación igual de completa, pero el atelier **no
 * podría quitar una sección**: borrar la canción la devolvería en la siguiente apertura,
 * porque la muestra volvería a asomar por debajo. La muestra se escribe una vez —al crear
 * el evento y al cambiar de diseño—, y desde ahí es suya.
 *
 * **Sin fila, la muestra; con fila vacía, vacío.** Son dos cosas distintas y el
 * repositorio ya las distingue: `null` es un evento que nunca se sembró —los anteriores a
 * esta tabla, los sembrados a mano, los de las pruebas—, y `{}` es un atelier que borró
 * todo a propósito. Confundirlas dejaría en blanco las invitaciones viejas o impediría
 * vaciar las nuevas.
 *
 * Si la lectura falla se pinta el contenido del diseño y ya está: que la base no responda
 * no puede dejar en blanco una invitación que alguien está mirando, que es la misma
 * decisión que ya toma la mesa de regalos en esa página.
 */
export const contentFor =
  (repo: ContentRepository) =>
  async (eventId: string, defaultContent: InvitationContent): Promise<InvitationContent> => {
    try {
      const crudo = await repo.find(eventId)
      return crudo === null ? defaultContent : parseInvitationContent(crudo)
    } catch (cause) {
      console.error('No se pudo leer el contenido del evento %s:', eventId, cause)
      return defaultContent
    }
  }

/**
 * Guarda un bloque, dejando los demás como estaban.
 *
 * El bloque es la unidad de edición porque es la unidad de sentido: la pantalla del panel
 * enseña un formulario por bloque, y guardar «la canción» sin tocar «el itinerario» es lo
 * que el atelier espera.
 */
export const saveContentBlock =
  (repo: ContentRepository) =>
  async (eventId: string, section: SectionKey, value: unknown): Promise<void> => {
    const actual = parseInvitationContent(await repo.find(eventId))
    const parcheado = parseInvitationContent({ ...actual, [section]: value })
    await repo.save(eventId, parcheado)
  }

/**
 * Siembra el contenido del diseño en lo que esté vacío.
 *
 * **Nunca pisa lo que el atelier escribió.** Cambiar de diseño para ver cómo queda no
 * puede llevarse por delante el itinerario de una boda, y sería la peor forma posible de
 * descubrir esta regla. Solo rellena huecos.
 */
export const seedContentForTheme =
  (repo: ContentRepository) =>
  async (eventId: string, defaultContent: InvitationContent): Promise<void> => {
    const actual = parseInvitationContent(await repo.find(eventId))
    await repo.save(eventId, mergeContent(defaultContent, actual))
  }

/** Vacía el contenido. Lo llama la retención cuando el evento vence. */
export const clearContent = (repo: ContentRepository) => (eventId: string) => repo.clear(eventId)
