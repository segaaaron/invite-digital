import type { Viewport } from 'next'

/**
 * Sin zoom, en las cinco raíces de layout. Decisión del usuario: la web, el panel y la
 * invitación se comportan como una aplicación, no como un documento que se amplía.
 *
 * Este meta lo respeta Android. **Safari de iPad y iPhone lo ignora desde iOS 10**, a
 * propósito; allí lo corta `touch-action: pan-x pan-y` en `globals.css`, que quita el
 * pellizco y el doble toque sin quitar el desplazamiento. Hacen falta los dos.
 */
export const SIN_ZOOM: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}
