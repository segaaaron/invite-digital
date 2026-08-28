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
 * **No escribe.** Lee lo guardado y lo fusiona con el de muestra del tema para pintar. Una
 * invitación popular se abre cientos de veces y ninguna de esas aperturas tiene por qué
 * dejar una escritura detrás; quien escribe es `seedContentForTheme`, cuando el atelier
 * crea el evento o cambia de diseño.
 *
 * Si la lectura falla se pinta el contenido del diseño y ya está. Que la base no responda
 * no puede dejar en blanco una invitación que alguien está mirando: es la misma decisión
 * que ya toma la mesa de regalos en esta página.
 */
export const contentFor =
  (repo: ContentRepository) =>
  async (eventId: string, defaultContent: InvitationContent): Promise<InvitationContent> => {
    try {
      const crudo = await repo.find(eventId)
      return mergeContent(defaultContent, parseInvitationContent(crudo))
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
