import type { ReactNode } from 'react'

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
 * Sin botones al lado, sin flechas y sin barra: lo único que se ve es la invitación.
 */
export function PhonePreview({ children }: { readonly children: ReactNode }) {
  return (
    <div className="theme-phone-stage">
      <div className="theme-phone-frame">{children}</div>
    </div>
  )
}
