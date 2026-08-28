import type { ThemeProps } from '../contract'
import { PIEL } from './xv-fantasia.skin'
import { XvSharedView } from './xv.view'

/**
 * «Noche Estrellada» — Alicia.
 *
 * La composición de XV con su piel. Siete de los ocho diseños la comparten: en la maqueta
 * también son el mismo diseño repintado, y copiarlo serían cuatro mil líneas donde un
 * arreglo hay que hacerlo siete veces.
 */
export function XvFantasiaView(props: ThemeProps) {
  return <XvSharedView {...props} piel={PIEL} />
}
