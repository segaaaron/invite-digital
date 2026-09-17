import Image from 'next/image'
import type { CSSProperties } from 'react'

/**
 * Una fotografía vertical a pantalla completa que **no se pierde en pantallas anchas**.
 *
 * En el teléfono cubre la pantalla, como siempre. En horizontal —computadora, tablet girada—
 * cubrir con una foto vertical la amplía hasta recortarle media imagen y la deja borrosa; ahí
 * se enseña **entera** en el centro, y la misma foto, desenfocada, llena los lados.
 */
export function FotoDeFondo({ src, filter, opacity = 1, priority = false }: { src: string; filter?: string; opacity?: number; priority?: boolean }) {
  const base: CSSProperties = { pointerEvents: 'none', opacity }
  return (
    <>
      <Image
        alt=""
        aria-hidden
        className="landscape:scale-110 landscape:blur-2xl landscape:brightness-90"
        fill
        priority={priority}
        quality={90}
        sizes="100vw"
        src={src}
        style={{ ...base, objectFit: 'cover', ...(filter === undefined ? {} : { filter }) }}
      />
      <Image
        alt=""
        aria-hidden
        className="hidden landscape:block"
        fill
        priority={priority}
        quality={90}
        sizes="(orientation: landscape) 60vh, 1px"
        src={src}
        style={{ ...base, objectFit: 'contain', ...(filter === undefined ? {} : { filter }) }}
      />
    </>
  )
}
