import type { ItineraryRow } from '../../../domain/invitation-content'

const PASO = 62
const ARRIBA = 30

type Props = {
  readonly filas: readonly ItineraryRow[]
  /** El camino punteado y las flores. */
  readonly oro: string
  readonly hora: string
  readonly rotulo: string
  readonly serif: string
  readonly mono: string
}

/**
 * El itinerario de «Editorial» en V3 (`wedding-variants-4.jsx:129`): un camino punteado que
 * serpentea de un lado al otro con una flor dorada en cada hito, y la hora y el momento del
 * lado de dentro.
 *
 * El camino se dibuja en un lienzo de 100 de ancho estirado a la columna
 * (`preserveAspectRatio="none"`), como la maqueta: así cada hito cae al 10 % o al 90 %.
 */
export function ItinerarioOndulado({ filas, oro, hora, rotulo, serif, mono }: Props) {
  const alto = ARRIBA + PASO * Math.max(filas.length - 1, 0) + 30
  const puntos = filas.map((_, i) => ({ x: i % 2 === 0 ? 10 : 90, y: ARRIBA + i * PASO }))
  const camino = puntos
    .map((p, i) => {
      const anterior = puntos[i - 1]
      return anterior === undefined ? `M ${p.x} ${p.y}` : `Q 50 ${(anterior.y + p.y) / 2} ${p.x} ${p.y}`
    })
    .join(' ')

  return (
    <ol style={{ position: 'relative', height: alto, marginTop: 8, listStyle: 'none', padding: 0 }}>
      <svg
        aria-hidden
        height={alto}
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0 }}
        viewBox={`0 0 100 ${alto}`}
        width="100%"
      >
        <path d={camino} fill="none" opacity="0.9" stroke={oro} strokeDasharray="2.2 2.6" strokeWidth="1.4" />
      </svg>
      {filas.map((fila, i) => {
        const punto = puntos[i] ?? { x: 10, y: ARRIBA }
        const izquierda = punto.x < 50
        return (
          <li
            key={`${fila.time}-${fila.label}`}
            style={{ position: 'absolute', top: punto.y, left: 0, right: 0, transform: 'translateY(-50%)' }}
          >
            <svg
              aria-hidden
              height="30"
              style={{
                position: 'absolute',
                left: `${punto.x}%`,
                top: '50%',
                transform: 'translate(-50%,-50%)',
                filter: `drop-shadow(0 0 5px ${oro}) drop-shadow(0 0 9px rgba(201,169,97,0.7))`,
              }}
              viewBox="0 0 24 24"
              width="30"
            >
              <g fill="none" stroke={oro} strokeWidth="1">
                <circle cx="12" cy="7" r="3" />
                <circle cx="17" cy="12" r="3" />
                <circle cx="12" cy="17" r="3" />
                <circle cx="7" cy="12" r="3" />
                <circle cx="12" cy="12" fill={oro} r="1.6" />
              </g>
            </svg>
            <div
              style={{
                position: 'absolute',
                ...(izquierda ? { left: `${punto.x + 9}%` } : { right: `${100 - punto.x + 9}%` }),
                top: '50%',
                transform: 'translateY(-50%)',
                textAlign: izquierda ? 'left' : 'right',
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{ fontFamily: serif, fontSize: 29, color: hora }}>{fila.time}</div>
              <div style={{ fontFamily: mono, fontSize: 10.2, letterSpacing: '0.12em', color: rotulo, marginTop: 1 }}>{fila.label}</div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
