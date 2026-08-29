import type { CSSProperties, ReactNode } from 'react'

/**
 * Lo que distingue a un diseño de XV de otro.
 *
 * **Siete de los ocho comparten composición** —cabecera con «MIS QUINCE», titular XV /
 * AÑOS / nombre, dedicatoria en panel, retrato en arco, padres, fecha destacada, cuenta
 * atrás, saludo al invitado, recepción, mapa, cronograma de cuatro hitos, música,
 * vestimenta, avisos y cierre con firma— y lo que cambia es la piel: bajo el mar en
 * pasteles, partitura dorada sobre negro, mascarada morada, bosque verde, noche
 * estrellada, gala guinda, disco plateado.
 *
 * En la maqueta también son el mismo diseño repintado. Copiarlo siete veces serían cuatro
 * mil líneas donde un arreglo hay que hacerlo siete veces y se hace una.
 *
 * Todo lo que cambia entre diseños está aquí. Todo lo que cambia entre eventos está en
 * `event_content`. Lo que queda en la vista es la composición.
 */
export type PielXv = {
  /** El degradado o color de fondo del artículo entero. */
  readonly fondoBase: string
  /** El velo que se pone sobre la fotografía para que el texto se lea. */
  readonly velo: string
  /** La capa de fondo: la fotografía a sangre de este diseño. */
  readonly fondo: ReactNode
  /** Las burbujas, que solo tiene el de mar. */
  readonly burbujas: ReactNode
  /** La portada a pantalla completa, ya construida con sus datos. */
  readonly portada: (datos: {
    eyebrow: string
    name: string
    title: string
    openLabel: string
  }) => ReactNode
  readonly paleta: {
    readonly tinta: string
    readonly orquidea: string
    readonly uva: string
    readonly amatista: string
    readonly violetaHondo: string
    readonly violeta: string
    readonly malva: string
    readonly bruma: string
    readonly lila: string
    readonly lilaFuerte: string
    readonly blanco: string
    readonly vidrioFuerte: string
    readonly sombraFuerte: string
  }
  /** El cristal esmerilado sobre el que se apoya cada bloque. */
  readonly cristal: CSSProperties
  readonly corona: string
  readonly retrato: string
  /** La pieza que va sobre la cuenta atrás: el vestido en uno, la clave de sol en el otro. */
  readonly reloj: string
  readonly castillo: string
  readonly vestimenta: string
  /** La imagen del cierre: la concha en uno, la guitarra en el otro. */
  readonly cierre: string
  /** El icono del cronograma para una clave del itinerario. */
  readonly icono: (clave: string | undefined) => string
  /**
   * Si los iconos del cronograma son fotografías redondas en vez de siluetas recortadas.
   * Las de gala y las de disco lo son, y hay que recortarlas en círculo o salen cuadradas
   * dentro del disco.
   */
  readonly iconoRedondo?: boolean
  /** El filete ornamental que algunos diseños ponen encima y debajo de la fecha. */
  readonly ornamento?: ReactNode
  /**
   * Lo que el diseño pinta **a sangre, antes de la barra de arriba**: el retrato de la
   * quinceañera en Bosque Encantado y en Gala Real, la bola de espejos en Encanto Musical.
   *
   * No todos lo llevan —Bajo el Mar abre con el título— y por eso es opcional: quien no lo
   * declare empieza por la barra, como hasta ahora.
   */
  readonly apertura?: ReactNode
  /**
   * Cómo llama **este** diseño a sus secciones.
   *
   * No son traducciones —para eso está el diccionario—, son la voz del diseño: cuatro de
   * los ocho XV dicen «Cronograma» y «Detalles que Abrazan» donde los otros dicen
   * «Itinerario» y «Mesa de regalos». Lo que no se declare cae al diccionario, que es lo
   * correcto para un diseño que no tenga voz propia.
   */
  readonly rotulos?: {
    readonly itinerary?: string
    readonly gifts?: string
    readonly guestbook?: string
    readonly dressCode?: string
  }
}
