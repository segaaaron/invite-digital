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
 * El contenido de **una vista previa del panel**: lo escrito, y el ejemplo del modelo en lo
 * que todavía está en blanco.
 *
 * No es lo mismo que lo que ve el invitado, y por eso es otra función. Una invitación
 * repartida no puede enseñar datos que no escribió nadie —«El Bar de Miki» en la fiesta de
 * otro—, así que ahí se pinta lo guardado tal cual. Pero el panel es donde el cliente mira
 * **cómo queda su modelo** mientras lo rellena: con la fila vacía se quedaba en blanco,
 * sin portada y sin bloques, y además el editor no podía llevar la vista previa a la
 * sección que se abría, porque buscaba por el texto de esa sección y no había ninguno.
 */
export const contentForPreview =
  (repo: ContentRepository) =>
  async (eventId: string, defaultContent: InvitationContent): Promise<InvitationContent> => {
    try {
      const crudo = await repo.find(eventId)
      return mergeContent(defaultContent, crudo === null ? {} : parseInvitationContent(crudo))
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

/**
 * Siembra el contenido **vacío** de un evento nuevo.
 *
 * Antes se sembraba el contenido de muestra del diseño, y el cliente abría su invitación con
 * los nombres y la frase del catálogo ya escritos: parecía suya, no se sabía qué había que
 * cambiar y lo que no tocara salía publicado con datos inventados. Ahora la fila nace vacía
 * —que es distinto de no tener fila, donde el motor pinta la muestra— y el editor enseña esos
 * textos como ejemplo dentro de cada campo.
 */
export const seedEmptyContent = (repo: ContentRepository) => async (eventId: string): Promise<void> => {
  const actual = parseInvitationContent(await repo.find(eventId))
  await repo.save(eventId, actual ?? {})
}

/** Vacía el contenido. Lo llama la retención cuando el evento vence. */
export const clearContent = (repo: ContentRepository) => (eventId: string) => repo.clear(eventId)
