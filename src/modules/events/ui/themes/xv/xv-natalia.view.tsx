import type { ThemeProps } from '../contract'
import { XvSharedView } from './xv.view'
import { PIEL_NATALIA } from './xv-natalia.skin'

/**
 * «Encanto Marino» — Natalia, de `invites-1.jsx:588`.
 *
 * La misma composición que «Bajo el Mar» con la piel dorada sobre negro. No es un atajo:
 * en la maqueta también son el mismo diseño con otros colores y otras imágenes, y
 * copiarlo serían seiscientas líneas donde un arreglo hay que hacerlo dos veces.
 */
export function XvNataliaView(props: ThemeProps) {
  return <XvSharedView {...props} piel={PIEL_NATALIA} />
}
