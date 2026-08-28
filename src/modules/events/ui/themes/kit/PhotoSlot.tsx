import type { CSSProperties } from 'react'

type Props = {
  /** La imagen del evento, ya resuelta a su URL. Sin ella se pinta el hueco de la maqueta. */
  readonly src?: string | undefined
  readonly alt?: string
  readonly width?: number | string
  readonly height?: number | string
  readonly radius?: number
  readonly bg: string
  readonly border: string
  readonly color: string
  /** Lo que dice el hueco vacío. Del diccionario, nunca del código. */
  readonly label: string
  readonly objectPosition?: string
  readonly style?: CSSProperties
}

/**
 * Un hueco de fotografía.
 *
 * Con imagen la pinta; sin ella pinta el marcador rayado de la maqueta con su rótulo. Los
 * dos casos existen de verdad: el escaparate del catálogo no tiene fotos de nadie, y un
 * evento recién creado tampoco hasta que el atelier las suba.
 *
 * `loading="lazy"` en todas: estas invitaciones llevan hasta seis fotos y se abren en un
 * teléfono, a menudo con datos móviles, y las de la galería están a tres pantallas de
 * scroll.
 */
export function PhotoSlot({
  src,
  alt,
  width = '100%',
  height = 220,
  radius = 12,
  bg,
  border,
  color,
  label,
  objectPosition = 'center',
  style,
}: Props) {
  if (src !== undefined) {
    return (
      <div style={{ position: 'relative', width, height, borderRadius: radius, overflow: 'hidden', ...style }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- la sirve /media/[id], que
            no pasa por el optimizador de Next: lleva la puerta de contraseña del evento. */}
        <img
          alt={alt ?? label}
          loading="lazy"
          src={src}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition, display: 'block' }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: radius,
        background: bg,
        border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(135deg, transparent 0 14px, rgba(255,255,255,0.025) 14px 15px)',
        }}
      />
      <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, letterSpacing: '0.35em', color }}>
        {label}
      </div>
    </div>
  )
}
