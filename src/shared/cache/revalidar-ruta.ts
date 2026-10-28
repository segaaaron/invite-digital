import { revalidatePath } from 'next/cache'
import { rutaInternaDelPanel } from '@/shared/rutas/panel'

/**
 * `revalidatePath` con la dirección **del navegador**, no la de la carpeta.
 *
 * Next lo dice en su documentación: con un rewrite hay que pasarle el **destino**, el fichero de
 * la ruta, no lo que se ve en la barra. Desde que el panel se ve en inglés (`/dashboard/events/…`)
 * y las carpetas siguen en español (`/panel/eventos/…`), las 105 llamadas que había invalidaban
 * una ruta que no existe: no fallaban, no decían nada y la pantalla seguía con lo viejo.
 *
 * Así el código se sigue escribiendo en inglés —la regla del proyecto— y la tabla de
 * `shared/rutas/panel.ts` hace la vuelta. Lo que no es del panel (`/i/…`, `/es/…`) pasa igual.
 */
export function revalidarRuta(ruta: string, tipo?: 'page' | 'layout'): void {
  const interna = rutaInternaDelPanel(ruta)
  if (tipo === undefined) revalidatePath(interna)
  else revalidatePath(interna, tipo)
}
