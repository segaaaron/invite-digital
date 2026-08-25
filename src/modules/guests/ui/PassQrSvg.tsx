'use client'

import QRCode from 'qrcode'

/** Módulos de silencio alrededor del código; menos de uno y algunos lectores fallan. */
const QUIET = 1

/**
 * El mismo QR que ve el invitado en su enlace, pero dibujado en el cliente.
 *
 * `PassQr` es un componente de servidor y aquí el pase se genera **después** de que el
 * atelier pulse: no hay render de servidor donde dibujarlo. Se pinta la matriz a mano en
 * vez de pedirle el SVG a `qrcode` porque su salida trae los colores como hexadecimales
 * incrustados, y en este proyecto los hexadecimales solo viven en `tokens.css`.
 */
export function PassQrSvg({ url, label }: { url: string; label: string }) {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: 'M' })
  const size = modules.size
  const side = size + QUIET * 2

  let path = ''
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (modules.data[y * size + x]) path += `M${x + QUIET} ${y + QUIET}h1v1h-1z`
    }
  }

  return (
    <svg
      aria-label={`Pase de ${label}`}
      className="w-40 rounded-[4px] bg-white text-ink"
      role="img"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${side} ${side}`}
    >
      <path d={path} fill="currentColor" />
    </svg>
  )
}
