import type { ReactNode } from 'react'
import { sembrado } from '../random'

/**
 * La corona de hojas y luces que enmarca la cita de «Jardín Encantado».
 *
 * Portada de `BotanicalWreath` (`invites-1.jsx:866-955`) sin cambiarle un número: dos
 * tallos elípticos cerrados, una hoja por cada punto del tallo alternando el lado, siete
 * zarcillos, nueve ramitas de tres o cuatro cuentas y cinco destellos dentro del óvalo,
 * todo sobre un velo radial que oscurece el centro para que el texto se lea sobre la
 * fotografía del bosque.
 *
 * El diseño **no es un panel**: la maqueta pinta esta corona y mete la cita dentro. Con la
 * tarjeta de cristal que heredaba del esqueleto, la invitación perdía la pieza que le da
 * nombre.
 *
 * La posición de cada hoja sale del generador **con semilla** —41, la de la maqueta—, no
 * de `Math.random`: si no, el servidor coloca unas hojas y el navegador otras, y React
 * descarta el marcado del servidor en cada invitación abierta.
 */
export function BotanicalWreath({ color, children }: { readonly color: string; readonly children: ReactNode }) {
  const cx = 150
  const cy = 175
  const r = sembrado(41)

  const construirTallo = (rx: number, ry: number, fase: number, N: number) => {
    const pts: { x: number; y: number; a: number }[] = []
    for (let i = 0; i <= N; i++) {
      const a = fase + (i / N) * 360
      const rad = (a * Math.PI) / 180
      const jr = 1 + (r() - 0.5) * 0.05
      pts.push({ x: cx + rx * Math.cos(rad) * jr, y: cy - ry * Math.sin(rad) * jr, a })
    }
    return pts
  }

  const tallos = [construirTallo(132, 158, 4, 44), construirTallo(120, 144, -9, 40)]

  /** El tallo se cierra con cuadráticas entre puntos medios, como en la maqueta. */
  const trazoCerrado = (pts: { x: number; y: number }[]) => {
    const primero = pts[0]
    if (primero === undefined) return ''
    let d = `M${primero.x.toFixed(1)},${primero.y.toFixed(1)} `
    for (let i = 1; i <= pts.length; i++) {
      const p0 = pts[i - 1]
      const p1 = pts[i % pts.length]
      if (p0 === undefined || p1 === undefined) continue
      d += `Q${p0.x.toFixed(1)},${p0.y.toFixed(1)} ${((p0.x + p1.x) / 2).toFixed(1)},${((p0.y + p1.y) / 2).toFixed(1)} `
    }
    return `${d}Z`
  }

  const hojas: { x: number; y: number; angulo: number; tam: number; clave: string }[] = []
  tallos.forEach((pts, si) => {
    pts.forEach((p, i) => {
      const tam = 5 + r() * 4
      const dir = i % 2 === 0 ? 1 : -1
      hojas.push({ x: p.x, y: p.y, angulo: p.a + dir * (55 + r() * 15), tam, clave: `${si}-${i}` })
    })
  })

  const zarcillos: { x: number; y: number; angulo: number; escala: number }[] = []
  for (let i = 0; i < 7; i++) {
    const a = r() * 360
    const rad = (a * Math.PI) / 180
    const rr = 126 + r() * 10
    zarcillos.push({ x: cx + rr * Math.cos(rad), y: cy - rr * Math.sin(rad), angulo: a + r() * 60, escala: 0.7 + r() * 0.5 })
  }

  const ramitas: { x: number; y: number; angulo: number; n: number }[] = []
  for (let i = 0; i < 9; i++) {
    const a = r() * 360
    const rad = (a * Math.PI) / 180
    const rr = 118 + r() * 20
    ramitas.push({ x: cx + rr * Math.cos(rad), y: cy - rr * Math.sin(rad), angulo: a, n: 3 + Math.floor(r() * 2) })
  }

  const destellos: { x: number; y: number }[] = []
  for (let i = 0; i < 5; i++) {
    const a = r() * 360
    const rad = (a * Math.PI) / 180
    const rr = 30 + r() * 55
    destellos.push({ x: cx + rr * Math.cos(rad), y: cy - rr * Math.sin(rad) })
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 320, margin: '0 auto' }}>
      <svg
        aria-hidden
        style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.5))' }}
        viewBox="0 0 300 350"
      >
        <defs>
          <radialGradient cx="50%" cy="50%" id="wreathVeil" r="68%">
            <stop offset="0%" stopColor="rgba(10,22,15,.55)" />
            <stop offset="70%" stopColor="rgba(10,22,15,.4)" />
            <stop offset="100%" stopColor="rgba(10,22,15,0)" />
          </radialGradient>
        </defs>
        <ellipse cx={cx} cy={cy} fill="url(#wreathVeil)" rx="150" ry="172" stroke="none" />
        {destellos.map((sp, i) => (
          <circle cx={sp.x.toFixed(1)} cy={sp.y.toFixed(1)} fill={color} key={i} opacity="0.35" r="1.5" />
        ))}
        {tallos.map(trazoCerrado).map((d, i) => (
          <path d={d} fill="none" key={i} opacity={i === 0 ? 1 : 0.75} stroke={color} strokeWidth="1" />
        ))}
        {hojas.map((l) => (
          <g key={l.clave} transform={`translate(${l.x.toFixed(1)},${l.y.toFixed(1)}) rotate(${l.angulo.toFixed(1)})`}>
            <path
              d={`M0,0 Q${(l.tam * 0.35).toFixed(1)},${(-l.tam * 0.42).toFixed(1)} ${l.tam.toFixed(1)},0 Q${(l.tam * 0.35).toFixed(1)},${(l.tam * 0.42).toFixed(1)} 0,0 Z`}
              fill={color}
              stroke="none"
            />
            <line stroke="rgba(0,0,0,.15)" strokeWidth="0.4" x1={l.tam * 0.1} x2={l.tam * 0.9} y1="0" y2="0" />
          </g>
        ))}
        {zarcillos.map((t, i) => (
          <g
            fill="none"
            key={i}
            stroke={color}
            strokeWidth="1"
            transform={`translate(${t.x.toFixed(1)},${t.y.toFixed(1)}) rotate(${t.angulo.toFixed(1)}) scale(${t.escala.toFixed(2)})`}
          >
            <path d="M0,0 C6,-2 10,2 8,8 C6,13 -2,13 -4,7 C-6,2 -1,-3 4,-1" />
          </g>
        ))}
        {ramitas.map((sp, i) => (
          <g key={i} transform={`translate(${sp.x.toFixed(1)},${sp.y.toFixed(1)}) rotate(${sp.angulo.toFixed(1)})`}>
            {Array.from({ length: sp.n }, (_, j) => (
              <circle cx={j * 3.5} cy="0" fill={color} key={j} r="0.8" />
            ))}
          </g>
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: `${(cy / 350) * 100}%`,
          transform: 'translate(-50%,-50%)',
          width: '72%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        {children}
      </div>
    </div>
  )
}
