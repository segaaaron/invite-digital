import type { ItineraryRow } from '../../../domain/invitation-content'

const SANS = 'var(--font-dm-sans)'
const DISPLAY = 'var(--font-italiana)'
const CALIGRAFIA = 'var(--font-great-vibes)'

/**
 * El cronograma en zigzag de «Encanto Musical» en V3: una línea vertical con un rombo por
 * hito, y la hora en caligrafía y el momento en versalitas alternando de lado.
 */
export function CronogramaZigzag({
  filas,
  acento,
  hora,
  fondo,
}: {
  readonly filas: readonly ItineraryRow[]
  readonly acento: string
  readonly hora: string
  /** El color del aro alrededor del rombo: el del fondo, para que corte la línea. */
  readonly fondo: string
}) {
  const horaNodo = (texto: string) => <span style={{ fontFamily: CALIGRAFIA, fontSize: 34, color: hora }}>{texto}</span>
  const momentoNodo = (texto: string) => (
    <span
      style={{ fontFamily: SANS, fontSize: 11, letterSpacing: '0.16em', color: acento, fontWeight: 700, textTransform: 'uppercase' }}
    >
      {texto}
    </span>
  )
  return (
    <div style={{ position: 'relative', marginTop: 24 }}>
      <div aria-hidden style={{ position: 'absolute', left: '50%', top: 6, bottom: 6, width: 1, background: acento }} />
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 34 }}>
        {filas.map((fila, i) => (
          <li
            key={`${fila.time}-${fila.label}`}
            style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', alignItems: 'center' }}
          >
            <div style={{ textAlign: 'right', paddingRight: 18 }}>{i % 2 === 0 ? horaNodo(fila.time) : momentoNodo(fila.label)}</div>
            <div
              aria-hidden
              style={{ width: 9, height: 9, background: acento, transform: 'rotate(45deg)', margin: '0 auto', boxShadow: `0 0 0 3px ${fondo}` }}
            />
            <div style={{ textAlign: 'left', paddingLeft: 18 }}>{i % 2 === 0 ? momentoNodo(fila.label) : horaNodo(fila.time)}</div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export type EsferaXv = {
  /** Lado del cuadrado de la esfera; el radio es el 30 %. */
  readonly size: number
  /** Cuánto se separa el rótulo de la esfera. */
  readonly salida: number
  /** El aro, las marcas y el círculo interior. */
  readonly anillo: string
  /** Los puntos, sus rayas y el «XV» del centro. */
  readonly acento: string
  readonly hora: { readonly color: string; readonly size: number; readonly peso: number }
  readonly momento: { readonly color: string; readonly size: number; readonly tracking: string }
  readonly centro: { readonly font: string; readonly size: number; readonly peso?: number; readonly tracking?: number; readonly dy: number }
  readonly sombra: string
  /** El alto que se suma debajo para que quepa el rótulo de abajo. */
  readonly pie: number
  /** Dónde cae cada hito, en grados desde las doce; por defecto, repartidos por igual. */
  readonly angulos?: (n: number) => readonly number[]
}

/**
 * El cronograma como esfera de reloj con «XV» al centro (`invites-1.jsx`, Luciana y
 * Valeria en V3): cada hito es un punto sobre el aro con su hora y su momento por fuera.
 */
export function CronogramaEsfera({ filas, e }: { readonly filas: readonly ItineraryRow[]; readonly e: EsferaXv }) {
  const cx = e.size / 2
  const R = e.size * 0.3
  const angulos = e.angulos?.(filas.length) ?? filas.map((_, i) => (i * 360) / filas.length)
  const punto = (deg: number, r: number): readonly [number, number] => {
    const rad = ((deg - 90) * Math.PI) / 180
    return [cx + r * Math.cos(rad), cx + r * Math.sin(rad)]
  }
  return (
    <div style={{ position: 'relative', width: e.size, height: e.size + e.pie, margin: '0 auto' }}>
      <svg aria-hidden height={e.size} style={{ position: 'absolute', left: 0, top: 0 }} viewBox={`0 0 ${e.size} ${e.size}`} width={e.size}>
        <circle cx={cx} cy={cx} fill="none" opacity="0.6" r={R} stroke={e.anillo} strokeWidth="1.2" />
        {Array.from({ length: 12 }, (_, i) => {
          const [x1, y1] = punto(i * 30, R - 6)
          const [x2, y2] = punto(i * 30, R + 6)
          return <line key={i} opacity="0.5" stroke={e.anillo} strokeWidth="1" x1={x1} x2={x2} y1={y1} y2={y2} />
        })}
        {filas.map((fila, i) => {
          const deg = angulos[i] ?? 0
          const [x1, y1] = punto(deg, R)
          const [x2, y2] = punto(deg, R + e.salida)
          return (
            <g key={`${fila.time}-${fila.label}`}>
              <line stroke={e.acento} strokeDasharray="2 3" strokeWidth="0.8" x1={x1} x2={x2} y1={y1} y2={y2} />
              <circle cx={x1} cy={y1} fill={e.acento} opacity="0.3" r="5.5" />
              <circle cx={x1} cy={y1} fill={e.acento} r="3" style={{ filter: `drop-shadow(0 0 4px ${e.acento})` }} />
            </g>
          )
        })}
        <circle cx={cx} cy={cx} fill="none" opacity="0.4" r={R * 0.4} stroke={e.anillo} strokeWidth="0.8" />
        <text
          fill={e.acento}
          fontFamily={e.centro.font}
          fontSize={e.centro.size}
          fontWeight={e.centro.peso}
          letterSpacing={e.centro.tracking}
          textAnchor="middle"
          x={cx}
          y={cx + e.centro.dy}
        >
          XV
        </text>
      </svg>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {filas.map((fila, i) => {
          const deg = angulos[i] ?? 0
          const [x, y] = punto(deg, R + e.salida)
          const lado = Math.cos(((deg - 90) * Math.PI) / 180)
          const alinea = Math.abs(lado) < 0.2 ? 'center' : lado > 0 ? 'left' : 'right'
          return (
            <li
              key={`${fila.time}-${fila.label}`}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: `translate(${alinea === 'center' ? '-50%' : alinea === 'left' ? '0%' : '-100%'}, -50%)`,
                textAlign: alinea,
                whiteSpace: 'nowrap',
                maxWidth: 90 + (e.size > 220 ? 10 : 0),
                paddingLeft: alinea === 'left' ? 4 : 0,
                paddingRight: alinea === 'right' ? 4 : 0,
              }}
            >
              <div style={{ fontFamily: DISPLAY, fontSize: e.hora.size, fontWeight: e.hora.peso, color: e.hora.color, textShadow: e.sombra }}>
                {fila.time}
              </div>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: e.momento.size,
                  letterSpacing: e.momento.tracking,
                  color: e.momento.color,
                  marginTop: 3,
                  textShadow: e.sombra,
                  whiteSpace: 'normal',
                  textTransform: 'uppercase',
                }}
              >
                {fila.label}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
