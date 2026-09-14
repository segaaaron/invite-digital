import Link from 'next/link'
import type { ReactNode } from 'react'
import { CloseIcon } from '@/shared/design/ui/icons'

/**
 * La invitación dentro de un teléfono, centrada y sin nada a los lados.
 *
 * Es como la enseña la maqueta y es como hay que enseñarla: estos dieciséis diseños están
 * dibujados para la pantalla de un aparato —los pétalos que caen, el papel pintado, los
 * degradados que llegan a los bordes—, y servidos a lo ancho de un portátil dejan de ser
 * el modelo para ser el modelo dentro de otra cosa, con el fondo derramado por los lados.
 *
 * `ThemeColumn` limita el contenido a 480 y eso arregla el texto; no arregla esto. Lo que
 * falta es el aparato: el marco es el contenedor de scroll, así que los fondos `sticky` se
 * anclan a él y los `100vh` se recortan en el borde de la tarjeta.
 *
 * Sin flechas y sin barra: lo único que hay alrededor es la cruz de salir. Y esa sí hace
 * falta —la maqueta la lleva—, porque esta pantalla no tiene cabecera ni nada que la
 * enmarque: sin ella, salir es adivinar cuál de los botones del navegador toca.
 */
export function PhonePreview({
  children,
  exit,
  action,
}: {
  readonly children: ReactNode
  /** A dónde se sale, y cómo se llama esa salida para quien no ve el dibujo. */
  readonly exit?: { readonly href: string; readonly label: string }
  /**
   * La llamada a la acción del escaparate: «elegir este diseño».
   *
   * Va **fuera** de la tarjeta, abajo y centrada sobre el fondo oscuro: dentro taparía la
   * invitación, que es lo único que se viene a ver. Es opcional porque la vista previa del
   * panel enseña una boda ya vendida y ahí no hay nada que elegir.
   */
  readonly action?: { readonly href: string; readonly label: string }
}) {
  return (
    <div className="theme-phone-stage">
      {exit === undefined ? null : (
        <Link aria-label={exit.label} className="theme-phone-exit" href={exit.href} title={exit.label}>
          <CloseIcon />
        </Link>
      )}
      <div className="theme-phone-frame">{children}</div>
      {action === undefined ? null : (
        <Link className="theme-phone-cta" href={action.href}>
          {action.label}
        </Link>
      )}
    </div>
  )
}
