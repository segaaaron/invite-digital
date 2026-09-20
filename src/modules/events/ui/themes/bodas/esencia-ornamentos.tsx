import type { CSSProperties } from 'react'
import { PALETA as P } from './esencia.palette'

/**
 * Los adornos de «Esencia», portados de su maqueta (`esencia.jsx`): la rama de olivo, la
 * ramita suelta que se apoya en las esquinas de cada bloque y el filete con el rombo.
 *
 * Van en su propio fichero porque los usan la portada —que es un componente de cliente— y
 * la vista, y así ninguna de las dos arrastra a la otra.
 */
export function RamaDeOlivo({
  ancho = 160,
  opacidad = 0.1,
  giro = 0,
  espejo = false,
}: {
  readonly ancho?: number
  readonly opacidad?: number
  readonly giro?: number
  readonly espejo?: boolean
}) {
  return (
    <svg
      aria-hidden
      height={ancho * 0.4}
      style={{ opacity: opacidad, transform: `rotate(${giro}deg)${espejo ? ' scaleX(-1)' : ''}`, display: 'block' }}
      viewBox="0 0 200 80"
      width={ancho}
    >
      <path d="M2,70 Q60,50 100,40 T198,10" fill="none" stroke={P.oroBorde} strokeWidth="1" />
      {HOJAS.map(([x, y], i) => {
        const cy = y - (i % 2 ? 8 : -8)
        return (
          <ellipse
            cx={x}
            cy={cy}
            fill="none"
            key={`${x}-${y}`}
            rx="9"
            ry="4"
            stroke={P.oroBorde}
            strokeWidth="0.8"
            transform={`rotate(${i % 2 ? -35 : 35} ${x} ${cy})`}
          />
        )
      })}
    </svg>
  )
}

const HOJAS: readonly (readonly [number, number])[] = [
  [30, 58],
  [55, 48],
  [78, 42],
  [100, 38],
  [122, 30],
  [145, 22],
  [168, 15],
]

/** La ramita que asoma por las esquinas de un bloque. Va posicionada por quien la pone. */
export function RamitaDeOlivo({ style, ancho = 140, opacidad = 0.12 }: { readonly style?: CSSProperties; readonly ancho?: number; readonly opacidad?: number }) {
  return (
    <svg
      aria-hidden
      style={{ position: 'absolute', opacity: opacidad, pointerEvents: 'none', ...style }}
      viewBox="0 0 150 90"
      width={ancho}
    >
      <path d="M10 80 Q30 60 50 55 Q70 50 90 35 Q110 20 140 10" fill="none" stroke={P.oroBorde} strokeWidth="1.2" />
      {RAMITA.map(([cx, cy, rx, ry, giro]) => (
        <ellipse
          cx={cx}
          cy={cy}
          fill="none"
          key={`${cx}-${cy}`}
          rx={rx}
          ry={ry}
          stroke={P.oroBorde}
          strokeWidth="0.8"
          transform={`rotate(${giro} ${cx} ${cy})`}
        />
      ))}
      <circle cx="48" cy="58" fill={P.oroBorde} opacity="0.3" r="2.5" />
      <circle cx="88" cy="35" fill={P.oroBorde} opacity="0.3" r="2" />
    </svg>
  )
}

const RAMITA: readonly (readonly [number, number, number, number, number])[] = [
  [35, 62, 10, 5, -25],
  [55, 50, 9, 4.5, -20],
  [75, 40, 10, 5, -30],
  [95, 28, 8, 4, -15],
  [42, 68, 8, 4, 20],
  [62, 55, 9, 4, 15],
]

/** El filete que separa: dos rayas y un rombo, en el oro del diseño. */
export function FileteDeEsencia({ margen = '16px 0' }: { readonly margen?: string }) {
  return (
    <span
      aria-hidden
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: margen, opacity: 0.6 }}
    >
      <span style={{ display: 'block', width: 30, height: 1, background: P.oro }} />
      <span style={{ display: 'block', width: 6, height: 6, background: P.oro, transform: 'rotate(45deg)' }} />
      <span style={{ display: 'block', width: 30, height: 1, background: P.oro }} />
    </span>
  )
}

/** Los iconos de línea del diseño: los mismos trazos de la maqueta. */
export function IconoDeEsencia({ nombre, tamano = 48, opacidad = 0.5 }: { readonly nombre: ClaveDeIcono; readonly tamano?: number; readonly opacidad?: number }) {
  const trazo = { fill: 'none', stroke: P.oro, strokeWidth: 1.1, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg aria-hidden height={tamano} style={{ opacity: opacidad }} viewBox="0 0 48 48" width={tamano}>
      {DIBUJOS[nombre](trazo)}
    </svg>
  )
}

export type ClaveDeIcono = 'church' | 'glasses' | 'plate' | 'note' | 'bouquet' | 'heart' | 'star'

type Trazo = { fill: string; stroke: string; strokeWidth: number; strokeLinecap: 'round'; strokeLinejoin: 'round' }

const DIBUJOS: Record<ClaveDeIcono, (t: Trazo) => React.ReactNode> = {
  church: (t) => (
    <>
      <path d="M24 4 L24 12 M20 8 L28 8" {...t} />
      <path d="M12 22 L24 12 L36 22" {...t} />
      <rect height="18" width="20" x="14" y="22" {...t} />
      <path d="M22 40 V30 Q22 27 24 27 Q26 27 26 30 V40" {...t} />
    </>
  ),
  glasses: (t) => (
    <>
      <path d="M14 8 L18 26 Q18 32 24 32 Q30 32 30 26 L34 8" {...t} />
      <path d="M24 32 V42 M18 42 H30" {...t} />
      <path d="M34 12 L40 14 M14 12 L8 14" {...t} />
    </>
  ),
  plate: (t) => (
    <>
      <circle cx="24" cy="24" r="14" {...t} />
      <circle cx="24" cy="24" r="7" {...t} />
      <path d="M10 10 V22 M10 14 H13 M10 18 H13" {...t} />
      <path d="M38 10 V26" {...t} />
    </>
  ),
  note: (t) => (
    <>
      <path d="M18 34 V12 L34 8 V30" {...t} />
      <circle cx="15" cy="34" r="4" {...t} />
      <circle cx="31" cy="30" r="4" {...t} />
    </>
  ),
  bouquet: (t) => (
    <>
      <path d="M24 20 V40" {...t} />
      <circle cx="24" cy="14" r="6" {...t} />
      <circle cx="15" cy="20" r="5" {...t} />
      <circle cx="33" cy="20" r="5" {...t} />
    </>
  ),
  heart: (t) => <path d="M24 38 C24 38 8 28 8 17 Q8 9 16 9 Q22 9 24 16 Q26 9 32 9 Q40 9 40 17 Q40 28 24 38 Z" {...t} />,
  star: (t) => <path d="M24 6 L28 20 L42 20 L31 29 L35 43 L24 34 L13 43 L17 29 L6 20 L20 20 Z" {...t} />,
}
