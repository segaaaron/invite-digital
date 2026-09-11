import { sembrado } from './random'

const N = 25

/**
 * El código de la mesa de regalos, tal y como lo dibuja la maqueta.
 *
 * Es **decorativo**: la maqueta pinta un patrón con sus tres marcadores de posición, su
 * pauta de sincronía y sus puntos, y no codifica nada. Aquí igual, y por eso lleva
 * `aria-hidden`: un lector de pantalla no tiene nada que anunciar de un dibujo.
 *
 * El pase de entrada —ese sí— es un QR de verdad, y vive en `checkin/ui/PassQr`.
 *
 * Los puntos salen del generador con semilla del kit, no de `Math.random`: con azar real,
 * el servidor pinta un código y el navegador otro, y React descarta el marcado del
 * servidor en cada invitación abierta.
 */
export function MarcoQr({
  size = 88,
  fg,
  bg,
  seed = 1018,
  aro,
}: {
  readonly size?: number
  readonly fg: string
  readonly bg: string
  readonly seed?: number
  /** El color del aro que algunos diseños ponen alrededor del papel. Sin él, solo sombra. */
  readonly aro?: string | undefined
}) {
  const aleatorio = sembrado(seed)
  const rejilla: number[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => 0))

  const marcador = (ox: number, oy: number): void => {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const anillo = x === 0 || x === 6 || y === 0 || y === 6
        const nucleo = x >= 2 && x <= 4 && y >= 2 && y <= 4
        rejilla[oy + y]![ox + x] = anillo || nucleo ? 1 : 0
      }
    }
  }
  marcador(0, 0)
  marcador(N - 7, 0)
  marcador(0, N - 7)

  for (let i = 8; i < N - 8; i += 1) {
    rejilla[6]![i] = i % 2
    rejilla[i]![6] = i % 2
  }

  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 5; x += 1) {
      const anillo = x === 0 || x === 4 || y === 0 || y === 4
      if (anillo || (x === 2 && y === 2)) rejilla[N - 9 + y]![N - 9 + x] = 1
    }
  }

  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      if (rejilla[y]![x] === 0) rejilla[y]![x] = aleatorio() > 0.5 ? 1 : 0
    }
  }

  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        padding: aro === undefined ? 8 : 3,
        background: bg,
        borderRadius: 8,
        lineHeight: 0,
        flexShrink: 0,
        boxShadow: aro === undefined ? undefined : `0 0 0 1.5px ${aro}, 0 4px 16px rgba(0,0,0,.3)`,
      }}
    >
      <svg height={size} shapeRendering="crispEdges" style={{ background: bg, borderRadius: 2 }} viewBox={`0 0 ${N} ${N}`} width={size}>
        {rejilla.flatMap((fila, y) =>
          fila.map((valor, x) => (valor === 1 ? <rect fill={fg} height="1" key={`${x},${y}`} width="1" x={x} y={y} /> : null)),
        )}
      </svg>
    </span>
  )
}
