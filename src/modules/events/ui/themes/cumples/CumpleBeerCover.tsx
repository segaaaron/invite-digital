'use client'

import Image from 'next/image'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'

type Props = {
  /** El color de debajo, para el instante en que la imagen todavía no está. */
  readonly bg: string
  readonly accent: string
  /** El arte de portada del diseño: la etiqueta de cervecería, con el medallón vacío. */
  readonly bgAsset: string
  /** Quien cumple. Va rotulado dentro del medallón, que es donde lo pone el arte. */
  readonly name: string
  readonly openLabel: string
}

/** El tamaño del arte. El nombre se coloca en sus coordenadas, no en las de la pantalla. */
const ARTE = { ancho: 768, alto: 1376 } as const

/**
 * El hueco del medallón, medido sobre el arte con el nombre original todavía puesto: el
 * interior verde va de (184, 382) a (585, 734) y «MIGUEL» ocupaba 377 px de ancho con las
 * mayúsculas centradas en y = 548.
 */
const MEDALLON = { x: 384, centroY: 548, ancho: 377 } as const

/**
 * El rótulo del arte es una condensada de taberna y Cinzel es mucho más ancha: a la altura
 * de mayúscula del original (106 px) «MIGUEL» mediría 640 px de ancho y se saldría del
 * medallón. Se pinta grande y se estrecha al 68 %, que es lo que acerca más el tamaño al del
 * original sin salirse del redondo —al 59 %, con la altura exacta, las letras salen finas y
 * estiradas, y ya no se parecen—.
 */
const CONDENSADA = 0.68
/** El tope de tamaño: con él «MIGUEL» sale como en el arte, 95 px de mayúscula contra 106. */
const TAMANO_MAXIMO = 136
/** Ancho medio de una mayúscula de Cinzel, medido en el propio fichero: 3,991 em / 6. */
const EM_POR_LETRA = 0.68
/** Cinzel: `sCapHeight` 700 sobre 1000 unidades por em. */
const ALTURA_DE_MAYUSCULA = 0.7

/**
 * La portada de «Cervecería Vintage»: la ilustración a sangre y el nombre de quien cumple
 * dentro del medallón.
 *
 * **El arte va sin nombre y el nombre se pinta encima.** Venía con «MIGUEL» rotulado dentro
 * —es de quien se hizo la invitación— y así el modelo solo servía para él: cualquier otro
 * cumpleaños abriría su invitación con el nombre de otra persona. Se le quitó del propio
 * archivo, dejando el medallón vacío, y ahora lo escribe el diseño con lo que el cliente
 * pone en su panel.
 *
 * Va en un `<svg>` con el `viewBox` del arte, y no en un `<div>` con porcentajes: así el
 * texto se escala y se recorta **exactamente igual** que la ilustración, en el teléfono y
 * en el marco del escaparate, sin cuentas de proporción en ninguna parte.
 *
 * Es un `<button>` a pantalla completa y no un `<div onClick>`: con un div, quien navega
 * con teclado no puede abrirla y la invitación se acaba en la portada.
 */
export function CumpleBeerCover({ bg, accent, bgAsset, name, openLabel }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [reducido] = useState(prefiereMenosMovimiento)

  if (abierta) return null

  const escrito = name.trim()
  // El nombre llena el medallón y no se sale: los largos encogen, los cortos no se estiran.
  const letras = Math.max(escrito.length, 1)
  const tamano = Math.min(TAMANO_MAXIMO, Math.round(MEDALLON.ancho / CONDENSADA / (EM_POR_LETRA * letras)))
  const naturales = EM_POR_LETRA * letras * tamano

  return (
    <button
      aria-label={openLabel}
      data-portada=""
      onClick={() => setAbierta(true)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        width: '100%',
        overflow: 'hidden',
        background: bg,
        color: accent,
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      {/* `contain`, no `cover`: el arte se ve **entero**, pedido por el usuario el 19 de
          septiembre y repetido. La maqueta usa `cover` y ahí las botellas de los bordes salen
          cortadas; aquí no, a cambio de dos franjas de la madera del fondo arriba y abajo, que
          es el mismo tono del borde del propio arte. */}
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'contain' }} />

      {escrito === '' ? null : (
        <svg
          // `meet` para que case con el `contain` de la imagen: el nombre se escala igual que
          // la ilustración, así no se sale del medallón.
          preserveAspectRatio="xMidYMid meet"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox={`0 0 ${ARTE.ancho} ${ARTE.alto}`}
        >
          <text
            lengthAdjust="spacingAndGlyphs"
            style={{
              fontFamily: 'var(--font-cinzel)',
              fontSize: tamano,
              fontWeight: 700,
              fill: '#f3e0b8',
              paintOrder: 'stroke fill',
              stroke: 'rgba(12,8,4,0.55)',
              strokeWidth: 2,
              // El rótulo del arte va con su sombra: sin ella, sobre el verde del medallón el
              // nombre se ve pegado y plano.
              filter: 'drop-shadow(0 6px 5px rgba(0,0,0,0.75))',
            }}
            textAnchor="middle"
            // Se estrecha al ancho del medallón; un nombre corto se queda a su ancho natural,
            // porque estirarlo lo deformaría al revés.
            textLength={naturales > MEDALLON.ancho ? MEDALLON.ancho : undefined}
            x={MEDALLON.x}
            // La línea base, desde el centro de las mayúsculas: así el nombre queda centrado
            // en el redondo sea cual sea su tamaño.
            y={Math.round(MEDALLON.centroY + (ALTURA_DE_MAYUSCULA * tamano) / 2)}
          >
            {escrito.toUpperCase()}
          </text>
        </svg>
      )}
    </button>
  )
}
