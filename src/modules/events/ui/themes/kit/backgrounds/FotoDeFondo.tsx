import Image from '@/shared/design/ui/ImagenQueAparece'

/**
 * Una fotografía de fondo a sangre. En pantallas anchas no se estira: la página del invitado
 * enseña la invitación dentro de un teléfono (`invitacion-marco` en `keyframes.css`).
 */
export function FotoDeFondo({ src, filter, opacity = 1, priority = false }: { src: string; filter?: string; opacity?: number; priority?: boolean }) {
  return (
    <Image
      alt=""
      aria-hidden
      fill
      priority={priority}
      quality={90}
      sizes="(min-width: 768px) 430px, 100vw"
      src={src}
      style={{ objectFit: 'cover', pointerEvents: 'none', opacity, ...(filter === undefined ? {} : { filter }) }}
    />
  )
}
