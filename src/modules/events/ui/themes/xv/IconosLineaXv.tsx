import type { ReactNode } from 'react'

/**
 * Los iconos de línea del cronograma, tal y como los dibujan «Noche Estrellada» y «Bosque
 * Encantado» en la maqueta.
 *
 * Estos dos diseños no traen dibujos: su cronograma son cuatro trazos dorados dentro de un
 * disco. Sin ellos, la piel repetía la **misma** imagen en las cuatro filas —el farol en
 * uno, la luna en el otro—, que es lo que se veía.
 */
type Props = { readonly color: string; readonly size?: number }

const comun = (color: string): Record<string, string | number> => ({
  fill: 'none',
  stroke: color,
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
})

/** Los cuatro de «Bosque Encantado»: sobre, palco, notas y despedida. */
export function iconoBosque(clave: string | undefined, { color, size = 29 }: Props): ReactNode {
  const t = comun(color)
  const marco = { height: size, viewBox: '0 0 24 24', width: size } as const
  if (clave === 'corona') {
    return (
      <svg aria-hidden {...marco} {...t}>
        <path d="M4 18 L4 10 L8 13 L12 7 L16 13 L20 10 L20 18 Z" />
        <line x1="4" x2="20" y1="18" y2="18" />
      </svg>
    )
  }
  if (clave === 'fiesta') {
    return (
      <svg aria-hidden {...marco} {...t}>
        <circle cx="6" cy="18" r="2.3" />
        <circle cx="16" cy="16" r="2.3" />
        <path d="M8.3 18 L8.3 5 L18.3 3 L18.3 16" />
      </svg>
    )
  }
  if (clave === 'despedida') {
    return (
      <svg aria-hidden {...marco} {...t}>
        <path d="M13 3 L13 9 M13 9 L20 16 M9 6 L9 10 M9 10 L4 15" />
        <path d="M13 9 L9 10" />
      </svg>
    )
  }
  return (
    <svg aria-hidden {...marco} {...t}>
      <rect height="14" rx="1.5" width="18" x="3" y="5" />
      <path d="M3.5 6 L12 13 L20.5 6" />
    </svg>
  )
}

/**
 * Los cinco trazos del itinerario de «Noche Estrellada» y «Gala Real»: agenda, salón,
 * baile, **torta** y despedida (`invites-1.jsx:1866-1870`).
 *
 * Eran cuatro y faltaba la torta; peor aún, solo reconocía tres claves —`corona`,
 * `fiesta`, `despedida`— y el contenido de «Gala Real» usa `cena`, `baile`, `torta` y
 * `cierre`. Las cuatro caían al `return` final, así que esa invitación pintaba **cinco
 * agendas idénticas** donde la maqueta pone cinco dibujos distintos. No fallaba nada: se
 * veía, y solo se ve mirándolo.
 *
 * Por eso las claves van por pares: el nombre del dibujo y el del bloque que lo usa.
 */
export function iconoGala(clave: string | undefined, { color, size = 29 }: Props): ReactNode {
  const t = comun(color)
  const marco = { height: size, viewBox: '0 0 24 24', width: size } as const
  if (clave === 'torta') {
    return (
      <svg aria-hidden {...marco} {...t}>
        <rect height="8" rx="1" width="16" x="4" y="12" />
        <path d="M4 12 v-2 a2 2 0 0 1 2 -2 h12 a2 2 0 0 1 2 2 v2" />
        <line x1="12" x2="12" y1="4" y2="8" />
        <circle cx="12" cy="3" r="1" />
      </svg>
    )
  }
  if (clave === 'corona' || clave === 'cena') {
    return (
      <svg aria-hidden {...marco} {...t}>
        <path d="M12 3 L4 9 V21 H20 V9 Z" />
        <path d="M9 21 V14 H15 V21" />
      </svg>
    )
  }
  if (clave === 'fiesta' || clave === 'baile') {
    return (
      <svg aria-hidden {...marco} {...t}>
        <path d="M12 2 L12 22 M2 12 L22 12" />
        <circle cx="12" cy="12" r="7" />
      </svg>
    )
  }
  if (clave === 'despedida' || clave === 'cierre') {
    return (
      <svg aria-hidden {...marco} {...t}>
        <path d="M4 12 C4 7 8 4 12 4 C16 4 20 7 20 12" />
        <path d="M4 12 L4 18 M20 12 L20 18" />
        <path d="M2 18 h4 v3 h-4 z M18 18 h4 v3 h-4 z" />
      </svg>
    )
  }
  return (
    <svg aria-hidden {...marco} {...t}>
      <rect height="17" rx="2" width="18" x="3" y="4" />
      <line x1="3" x2="21" y1="9" y2="9" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <path d="M8 13 L10.5 15.5 L15 11" />
    </svg>
  )
}
