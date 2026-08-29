type ColorProps = { readonly color: string }

/**
 * El sobre de línea que preside la lluvia de sobres.
 *
 * Es un dibujo del diseño, no una fotografía ni un icono del kit: la maqueta lo traza con
 * tres líneas dentro de la tarjeta de regalos, encima del rótulo. Sin él, «Lluvia de
 * Sobres» es una línea de texto suelta en medio de una tarjeta.
 */
export function SobreDeLinea({ color }: ColorProps) {
  return (
    <svg aria-hidden height="80" style={{ display: 'block', margin: '0 auto' }} viewBox="0 0 110 80" width="110">
      <rect fill="none" height="72" rx="4" stroke={color} strokeWidth="2" width="102" x="4" y="4" />
      <path d="M6 8 L55 48 L104 8" fill="none" stroke={color} strokeWidth="2" />
      <line stroke={color} strokeLinecap="round" strokeWidth="2" x1="40" x2="70" y1="64" y2="64" />
    </svg>
  )
}

/**
 * El filete que se desvanece por los dos extremos, al 40 % del ancho.
 *
 * Separa dentro de una misma tarjeta —el sobre de la mesa de regalos, el título del
 * formulario de sus campos—. Estaba escrito a mano en tres sitios de esta vista con los
 * mismos valores; una línea que se dibuja tres veces es una línea que se desajusta dos.
 */
export function FileteDegradado({ color, margin }: ColorProps & { readonly margin: string }) {
  return (
    <div
      aria-hidden
      style={{
        width: '40%',
        height: 1.5,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        margin,
      }}
    />
  )
}
