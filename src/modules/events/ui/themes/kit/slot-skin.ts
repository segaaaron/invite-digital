import type { CSSProperties } from 'react'

/**
 * La piel que un diseño le presta a **lo que no dibuja él**: el formulario de RSVP, la
 * mesa de regalos, la respuesta del libro de firmas y el pase.
 *
 * Esas cuatro piezas son nuestras, no de la maqueta: llevan lógica —una Server Action, una
 * reserva que la base decide, un QR— y por eso viven en su módulo y se colocan en las
 * ranuras. El problema es que estaban escritas con los colores de la web pública, marfil y
 * dorado, y se metían **tal cual** dentro de una invitación guinda, negra o verde botánica:
 * un recuadro blanco con letra parda en mitad de «Gala Real». La maqueta no hace eso —cada
 * diseño pinta su propio formulario, con su vidrio y su oro—.
 *
 * En vez de dieciséis formularios, el diseño **redefine los tokens de color** en su propio
 * `<article>`. Las clases de esas cuatro piezas ya se escriben contra esos tokens
 * (`border-line`, `bg-bg-raised`, `text-ink`…), así que heredan la paleta del diseño sin
 * tocar una sola de ellas, y el tema clásico —que es marfil de verdad— se queda como está
 * sin declarar nada.
 */
export type SlotSkin = {
  /** El fondo de una tarjeta: el vidrio del diseño. */
  readonly panel: string
  /** El fondo de un campo de formulario. */
  readonly campo: string
  /** El fondo hundido: el canal de la barra de progreso de un fondo en efectivo. */
  readonly hueco: string
  readonly tinta: string
  readonly tintaSuave: string
  readonly tintaTenue: string
  /** El acento: el oro, el plata o el lila de este diseño. */
  readonly acento: string
  readonly acentoHondo: string
  /** La tinta que va **encima** del acento: el texto del botón de confirmar. */
  readonly sobreAcento: string
  /** El color del filete de las tarjetas y los botones. */
  readonly linea: string
  /** La tipografía de titular del diseño, si tiene una propia. */
  readonly display?: string
  /**
   * La caligrafía del diseño, para el saludo de «¡Gracias, Jorge!».
   *
   * Va en su propio token y no en `--font-display` porque esa la usan también los nombres
   * de la mesa de regalos, y «Juego de sábanas de lino» en letra inglesa no se lee.
   */
  readonly caligrafia?: string
  /** El redondeo de tarjeta del diseño, si no es el de la web pública. */
  readonly radio?: number
}

/**
 * Los tokens, listos para el `style` del `<article>` del diseño.
 *
 * Son los mismos nombres que declara `tokens.css`: redefinirlos aquí los cambia **solo
 * dentro** de la invitación, por la cascada, sin tocar la web pública ni el panel.
 */
export function variablesDeRanuras(skin: SlotSkin): CSSProperties {
  return {
    '--color-bg-raised': skin.panel,
    '--color-bg-top': skin.campo,
    '--color-bg-sunken': skin.hueco,
    '--color-ink': skin.tinta,
    '--color-ink-soft': skin.tintaSuave,
    '--color-ink-mute': skin.tintaTenue,
    '--color-gold': skin.acento,
    '--color-gold-deep': skin.acentoHondo,
    '--color-gold-light': skin.acento,
    '--color-on-gold': skin.sobreAcento,
    '--color-line': skin.linea,
    ...(skin.display === undefined ? {} : { '--font-display': skin.display }),
    ...(skin.caligrafia === undefined ? {} : { '--font-script': skin.caligrafia }),
    ...(skin.radio === undefined ? {} : { '--radius-card': `${skin.radio}px` }),
  } as CSSProperties
}

/** `#rrggbb` a `r, g, b`. Devuelve `null` si no es un hexadecimal de seis dígitos. */
function canales(hex: string): string | null {
  const limpio = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (limpio === null) return null
  const valor = Number.parseInt(limpio[1] ?? '', 16)
  return `${(valor >> 16) & 255}, ${(valor >> 8) & 255}, ${valor & 255}`
}

const conAlfa = (hex: string, alfa: number): string => {
  const rgb = canales(hex)
  return rgb === null ? hex : `rgba(${rgb}, ${alfa})`
}

/**
 * La piel de las ranuras a partir de los dos colores que un diseño siempre tiene: su tinta
 * y su acento.
 *
 * Los fondos y el filete salen del acento con alfa, no de un color nuevo: un hexadecimal
 * más por diseño serían dieciséis colores inventados que nadie eligió, y sobre el papel o
 * la fotografía del diseño un velo del propio acento es lo que hace la maqueta.
 *
 * Los ocho diseños de boda la usan. Los de XV no: ya tienen su vidrio esmerilado en la
 * paleta —`vidrio`, `vidrioFuerte`, `bordeVidrio`—, que es más que un velo plano, y pasan
 * esos valores a mano.
 */
export function pielDeRanuras(opciones: {
  readonly tinta: string
  readonly acento: string
  readonly acentoHondo?: string
  /** La tinta sobre el acento. Por defecto, el papel del propio diseño. */
  readonly sobreAcento: string
  readonly display?: string
  readonly radio?: number
}): SlotSkin {
  const { tinta, acento, acentoHondo, sobreAcento, display, radio } = opciones
  return {
    panel: conAlfa(acento, 0.07),
    campo: conAlfa(acento, 0.11),
    hueco: conAlfa(acento, 0.18),
    tinta,
    tintaSuave: conAlfa(tinta, 0.82),
    tintaTenue: conAlfa(tinta, 0.56),
    acento,
    acentoHondo: acentoHondo ?? acento,
    sobreAcento,
    linea: conAlfa(acento, 0.3),
    ...(display === undefined ? {} : { display }),
    ...(radio === undefined ? {} : { radio }),
  }
}
