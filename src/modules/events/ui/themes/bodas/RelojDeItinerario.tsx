import type { ItineraryRow } from '../../../domain/invitation-content'

type Props = {
  readonly filas: readonly ItineraryRow[]
  /** Lo que va en el centro de la esfera: las iniciales, «M & A». */
  readonly centro: string
  readonly aro: string
  readonly brillo: string
  readonly tinta: string
  readonly serif: string
  readonly display: string
  readonly mono: string
  readonly tamano?: number
}

/**
 * El itinerario como esfera de reloj (`ItineraryClock` de `wedding-variants-7.jsx`): un aro
 * con doce marcas, un punto de oro por hito y, hacia fuera, la hora y el momento.
 *
 * Los hitos se reparten por igual alrededor de la esfera —la maqueta pone seis cada 60°—,
 * así que con cuatro u ocho sigue cerrando la vuelta.
 */
export function RelojDeItinerario({ filas, centro, aro, brillo, tinta, serif, display, mono, tamano = 210 }: Props) {
  const cx = tamano / 2
  const cy = tamano / 2
  const R = tamano * 0.36
  const punto = (grados: number, radio: number): readonly [number, number] => {
    const rad = ((grados - 90) * Math.PI) / 180
    return [cx + radio * Math.cos(rad), cy + radio * Math.sin(rad)]
  }
  const hitos = filas.map((fila, indice) => ({ fila, grados: (indice * 360) / filas.length }))

  return (
    <div style={{ position: 'relative', width: tamano, height: tamano + 40, margin: '0 auto' }}>
      <svg aria-hidden height={tamano} style={{ position: 'absolute', left: 0, top: 0 }} viewBox={`0 0 ${tamano} ${tamano}`} width={tamano}>
        <circle cx={cx} cy={cy} fill="none" opacity="0.55" r={R} stroke={aro} strokeWidth="1.2" />
        {Array.from({ length: 12 }, (_, i) => {
          const [x1, y1] = punto(i * 30, R - 6)
          const [x2, y2] = punto(i * 30, R + 6)
          return <line key={i} opacity="0.5" stroke={aro} strokeWidth="1" x1={x1} x2={x2} y1={y1} y2={y2} />
        })}
        {hitos.map(({ fila, grados }) => {
          const [x1, y1] = punto(grados, R)
          const [x2, y2] = punto(grados, R + 34)
          return (
            <g key={`${fila.time}-${fila.label}`}>
              <line stroke={brillo} strokeDasharray="2 3" strokeWidth="0.8" x1={x1} x2={x2} y1={y1} y2={y2} />
              <circle cx={x1} cy={y1} fill={brillo} opacity="0.3" r="6" />
              <circle cx={x1} cy={y1} fill={brillo} r="3.2" style={{ filter: `drop-shadow(0 0 4px ${brillo})` }} />
            </g>
          )
        })}
        <circle cx={cx} cy={cy} fill="none" opacity="0.4" r={R * 0.4} stroke={aro} strokeWidth="0.8" />
        <text fill={brillo} fontFamily={display} fontSize="18" fontWeight="600" letterSpacing="1" textAnchor="middle" x={cx} y={cy + 6}>
          {centro}
        </text>
      </svg>
      {hitos.map(({ fila, grados }) => {
        const [x, y] = punto(grados, R + 34)
        const lado = Math.cos(((grados - 90) * Math.PI) / 180)
        const alineado = Math.abs(lado) < 0.2 ? 'center' : lado > 0 ? 'left' : 'right'
        const desplazamiento = alineado === 'center' ? '-50%' : alineado === 'left' ? '0%' : '-100%'
        return (
          <div
            key={`${fila.time}-${fila.label}`}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: `translate(${desplazamiento}, -50%)`,
              textAlign: alineado,
              whiteSpace: 'nowrap',
              paddingLeft: alineado === 'left' ? 6 : 0,
              paddingRight: alineado === 'right' ? 6 : 0,
            }}
          >
            <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 800, color: brillo }}>{fila.time}</div>
            <div style={{ fontFamily: mono, fontSize: 6, letterSpacing: '0.14em', color: tinta, marginTop: 3, textTransform: 'uppercase' }}>{fila.label}</div>
          </div>
        )
      })}
    </div>
  )
}
