import type { CSSProperties, ReactNode } from 'react'

/**
 * Una capa que se queda quieta mientras la invitación se desplaza: el fondo, o los pétalos
 * que caen por encima.
 *
 * Va **`sticky`**, no `fixed`, por lo mismo que los fondos de los XV: `fixed` se ancla al
 * antepasado más cercano con `transform`, y el marco de teléfono (vista previa, escaparate,
 * tablet) lleva `translateZ(0)`. Dentro de él una capa `fixed` se desplazaba con el
 * contenido y a la segunda pantalla la invitación se quedaba sin fondo. Con `sticky`,
 * `height: 100dvh` y `margin-bottom: -100dvh` se queda pegada arriba sin ocupar sitio.
 *
 * Tiene que ser hija directa del `<article>`, y lo que va delante del fondo necesita su
 * propio `position: relative` con un `z-index` mayor: una capa posicionada pinta encima
 * del contenido que no lo está.
 */
export function CapaFija({ zIndex, style, children }: { readonly zIndex: number; readonly style?: CSSProperties; readonly children?: ReactNode }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'sticky',
        top: 0,
        height: 'var(--alto, 100dvh)',
        marginBottom: 'calc(var(--alto, 100dvh) * -1)',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
