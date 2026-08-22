import QRCode from 'qrcode'

/** Módulos de silencio alrededor del código; menos de uno y algunos lectores fallan. */
const QUIET = 1

/**
 * El QR se dibuja en el servidor: el invitado abre su enlace y ya lo tiene, sin
 * descargar librería ninguna. El token viaja dentro del dibujo, nunca como texto que
 * alguien pueda leer por encima del hombro.
 *
 * Se dibuja la matriz a mano en vez de pedirle el SVG a `qrcode` porque su salida trae
 * los colores como hexadecimales incrustados, y en este proyecto los hexadecimales solo
 * pueden vivir en `tokens.css`. Aquí el color lo pone `currentColor` y lo fija una clase.
 */
export async function PassQr({
  url,
  label,
  labels,
}: {
  url: string
  label: string
  /** La página del invitado habla el idioma del evento, no el del navegador. */
  labels: { title: string; hint: string; alt: string }
}) {
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
    <section className="mx-auto flex w-fit flex-col items-center gap-3 rounded-2xl border border-line bg-bg-raised p-6">
      <p className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{labels.title}</p>
      <svg
        role="img"
        aria-label={`${labels.alt} ${label}`}
        viewBox={`0 0 ${side} ${side}`}
        shapeRendering="crispEdges"
        className="w-40 bg-bg-top text-ink"
      >
        <path d={path} fill="currentColor" />
      </svg>
      <p className="text-center text-[12px] text-ink-soft">{labels.hint}</p>
    </section>
  )
}
