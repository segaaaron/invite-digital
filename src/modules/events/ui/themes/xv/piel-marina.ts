import type { CSSProperties, ReactNode } from 'react'

/**
 * Lo que distingue a «Bajo el Mar» de «Encanto Marino».
 *
 * Los dos son la misma composición —cabecera, titular, dedicatoria, retrato, padres, fecha
 * destacada, cuenta atrás, saludo, recepción, mapa, cronograma en zigzag, música,
 * vestimenta, avisos y cierre— con dos pieles: uno en pasteles sobre fotografía de mar,
 * otro en dorado sobre negro con partitura de fondo.
 *
 * Todo lo que cambia entre ellos está aquí. Todo lo que cambia entre eventos está en
 * `event_content`. Lo que queda en la vista es la composición, que es la misma.
 */
export type PielMarina = {
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
}
