import { guests } from '@/app/composition/container'
import { invitationUrl } from '@/modules/guests/domain/invitation-url'
import { env } from '@/shared/config/env'
import { registrarFallo } from '@/shared/observability/fallos'
import { isErr } from '@/shared/result'

// Sin `'use server'` **a propósito**, como `admin-comun.ts`: en un fichero de acciones, cada función
// exportada es un extremo HTTP público, y esta devuelve el token de una invitación. Aquí es una función
// normal que solo pueden llamar la acción y la pantalla, las dos tras `requireAdmin()`.

/**
 * El enlace de la única invitación de la demo.
 *
 * **Los tres fallos se distinguen**, porque lo que hay que hacer es distinto en cada uno: si la base
 * pestañeó se vuelve a cargar y ya; si la demo no tiene invitado no hay nada que reintentar y toca
 * rehacerla. Colapsarlos en un `null` hacía que una demo buena se leyera como rota, y el admin la borraba
 * —en cascada y sin papelera— por un error pasajero.
 */
export type EnlaceDeDemo = { readonly estado: 'listo'; readonly url: string } | { readonly estado: 'no_se_pudo_leer' } | { readonly estado: 'sin_invitado' }

export async function enlaceDeLaDemo(eventId: string): Promise<EnlaceDeDemo> {
  const grupos = await guests.list(eventId)
  if (isErr(grupos)) {
    registrarFallo('admin/demos-actions', 'no se pudieron leer los invitados de la demo', grupos.error.kind, grupos.error.detail)
    return { estado: 'no_se_pudo_leer' }
  }
  const primero = grupos.value[0]
  if (primero === undefined) {
    // Permanente: la demo se creó sin invitado (el alta falló a medias). Reintentar no la arregla nunca.
    registrarFallo('admin/demos-actions', 'no se pudo dar el enlace: la demo se quedó sin invitado', 'storage_failure', eventId)
    return { estado: 'sin_invitado' }
  }
  const enlace = await guests.enlaceDe({ eventId, id: primero.id })
  if (isErr(enlace)) {
    registrarFallo('admin/demos-actions', 'no se pudo acuñar el enlace de la demo', enlace.error.kind, enlace.error.detail)
    return { estado: 'no_se_pudo_leer' }
  }
  return { estado: 'listo', url: invitationUrl(enlace.value.token, env.SITE_URL) }
}
