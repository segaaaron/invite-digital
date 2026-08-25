'use client'

import QRCode from 'qrcode'

/** Módulos de silencio alrededor del código; menos de uno y algunos lectores fallan. */
const QUIET = 1

/**
 * Un QR dibujado a mano, sin colores dentro.
 *
 * Se pinta la matriz módulo a módulo en vez de pedirle el SVG a `qrcode` porque su salida
 * trae los colores como hexadecimales incrustados, y en este proyecto los hexadecimales
 * solo viven en `tokens.css`. Con `currentColor` además hereda la tinta de quien lo
 * envuelve, que es lo que hace que valga igual sobre papel que sobre la tarjeta oscura.
 *
 * Es de cliente porque los dos sitios que lo usan —el pase y la hoja de reparto— dibujan
 * un enlace que **acaba de nacer en el navegador**: de él la base solo guarda el
 * SHA-256, así que no hay render de servidor donde pintarlo.
 */
export function QrCodeSvg({ url, label, className = 'w-40' }: { url: string; label: string; className?: string }) {
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
      aria-label={label}
      className={`rounded-[4px] bg-white text-ink ${className}`.trim()}
      role="img"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${side} ${side}`}
    >
      <path d={path} fill="currentColor" />
    </svg>
  )
}
