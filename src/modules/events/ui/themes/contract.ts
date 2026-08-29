import type { ComponentType, ReactNode } from 'react'
import type { FontKey } from '@/shared/design/font-manifest'
import type { InvitationDictionary, ThemeDictionary } from '@/shared/i18n/dictionary'
import type { Event } from '../../domain/event'
import type { InvitationContent, SectionKey } from '../../domain/invitation-content'

export type { SectionKey }

/**
 * Las ranuras, en vez de un `children` único.
 *
 * Estos dieciséis diseños **intercalan**: el RSVP va a dos tercios del scroll, entre el
 * código de vestimenta y la despedida, y el libro de firmas va después del cierre. Un
 * `children` solo puede ir en un sitio, y hasta ahora iba al final porque el único tema
 * que había lo ponía ahí.
 *
 * Lo que entra por estas ranuras es **lo nuestro**: el RSVP que escribe en la base, la
 * mesa de regalos que reserva de verdad y el libro de firmas que guarda el mensaje. Los
 * de la maqueta solo hacían `useState` y no guardaban nada.
 */
export type ThemeSlots = {
  /**
   * El saludo personalizado: a quién va dirigida esta invitación y cuántos lugares se le
   * reservaron.
   *
   * Va en su propia ranura y no dentro del RSVP porque varios diseños lo pintan en una
   * tarjeta propia, arriba del todo —«Tu presencia hará este día más especial · Lucas
   * Montaño · Reservamos 1 lugar para ti»—, y ahí es donde el invitado lo lee. Es dato
   * nuestro: sale del grupo, no del contenido que escribe el atelier.
   */
  readonly guest: ReactNode
  readonly rsvp: ReactNode
  readonly registry: ReactNode
  readonly guestbook: ReactNode
  readonly pass: ReactNode
  /**
   * El botón de «subir mis fotos» de la tarjeta «Comparte tus fotos».
   *
   * Es **opcional**, y es la única ranura que lo es: la tarjeta solo la pintan tres de los
   * dieciséis diseños, y obligar a las otras trece a colocar un botón que su maqueta no
   * dibuja sería inventarles una sección. Sin ranura, la tarjeta se queda con su icono y su
   * texto, que es lo que la maqueta enseña.
   */
  readonly photos?: ReactNode
}

export type ThemeProps = {
  readonly event: Event
  readonly content: InvitationContent
  /** Los rótulos del formulario y del pase, que el tema pasa a las piezas del kit. */
  readonly dictionary: InvitationDictionary
  /** Los rótulos que pinta el propio diseño: «Faltan», «Itinerario», «Código de vestimenta». */
  readonly themes: ThemeDictionary
  readonly slots: ThemeSlots
  /**
   * A quién va dirigida y cuántos pases tiene, **como dato**.
   *
   * La ranura `guest` trae una línea ya compuesta y sirve para los diseños que solo la
   * colocan; estos otros la **componen**: el nombre en caligrafía grande, el rótulo
   * «hemos reservado para ti», el número enorme y «pases». Con una cadena hecha no se
   * puede, y con dato sí. Sin invitado —el escaparate, la vista previa del panel— viene
   * la muestra del propio diseño.
   */
  readonly guestInfo?: { readonly label: string; readonly seats: number }
  /**
   * En la vista previa del catálogo las ranuras se pintan inertes y con su aviso. Un
   * formulario de muestra que parece funcionar y no guarda nada es peor que no tenerlo.
   */
  readonly preview?: boolean
}

/**
 * La paleta de un diseño.
 *
 * **Es el único sitio donde viven sus hexadecimales.** `tokens.css` es la fuente de los
 * colores de marca, y estos no lo son: son cientos, son de un solo diseño y no los decide
 * el atelier. Es la misma excepción que ya tiene el acento que viene de los datos de una
 * plantilla, ampliada con su motivo.
 *
 * El kit compartido no tiene ninguno: recibe todo color por prop, siempre. Un `#d4b483`
 * dentro de `MapPreview` reaparecería en la boda botánica, que es verde, y en el bosque
 * encantado, que también.
 */
export type ThemePalette = Readonly<Record<string, string>>

/**
 * Un tema no es solo un componente.
 *
 * `fonts` es lo que el layout de invitado consulta para no bajar doce familias cuando el
 * diseño usa cinco. `sections` es lo que el panel consulta para no pedirle un itinerario a
 * un diseño que no lo pinta. `defaultContent` es lo que hace que la invitación se vea
 * terminada desde el primer segundo, que es la mitad de lo que se vende.
 */
export type ThemeDefinition = {
  readonly key: string
  readonly label: string
  readonly categorySlug: 'boda' | 'boda-civil' | 'xv-anos'
  readonly palette: ThemePalette
  readonly fonts: readonly FontKey[]
  readonly sections: readonly SectionKey[]
  readonly defaultContent: InvitationContent
  readonly Component: ComponentType<ThemeProps>
}

/**
 * Las cuatro secciones que pinta todo diseño de esta colección.
 *
 * Quién es, cuándo, dónde y la despedida. Un diseño al que le falte una de las cuatro no
 * es una invitación: es una tarjeta.
 */
export const SECCIONES_OBLIGATORIAS: readonly SectionKey[] = ['hero', 'schedule', 'reception', 'closing']
