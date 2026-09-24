import type { ThemeProps } from '../contract'
import { PIEL } from './xv-luciana.skin'
import { XvSharedView } from './xv.view'

/**
 * «Bosque Encantado» — Luciana.
 *
 * La composición de XV con su piel. Siete de los ocho diseños la comparten: en la maqueta
 * también son el mismo diseño repintado, y copiarlo serían cuatro mil líneas donde un
 * arreglo hay que hacerlo siete veces.
 */
export function XvLucianaView(props: ThemeProps) {
  // Su maqueta no pinta a los padres: lo escrito antes en ese bloque no sale.
  const content = { ...props.content }
  delete content.hosts
  return <XvSharedView {...props} content={content} piel={PIEL} />
}
