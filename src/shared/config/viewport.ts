import type { Viewport } from 'next'

/**
 * El viewport de las cinco raíces de layout.
 *
 * **Se puede ampliar, y es un cambio deliberado.** Antes esto fijaba `maximumScale: 1` y
 * `userScalable: false` para que el sitio se comportara «como una aplicación». El
 * resultado en la mano era el contrario del buscado: Safari de iPhone y iPad **ignora**
 * `user-scalable=no` desde iOS 10, así que el pellizco seguía ampliando pero a saltos y
 * sin poder volver atrás — el «comportamiento raro» que se ve al tocar la pantalla.
 *
 * Y bloquearlo tampoco es gratis: impedir ampliar es un fallo de accesibilidad
 * reconocido (WCAG 2.1, criterio 1.4.4), y esto lo abre gente mayor leyendo la
 * invitación de una boda en un teléfono.
 *
 * Lo que sí arregla el desplazamiento lateral es recortar en la raíz —`html, body` con
 * `overflow-x: clip` en `globals.css`—, no quitarle el zoom al usuario.
 */
export const VIEWPORT: Viewport = {
  width: 'device-width',
  initialScale: 1,
}
