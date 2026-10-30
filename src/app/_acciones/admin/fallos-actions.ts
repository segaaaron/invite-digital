'use server'

import { revalidarRuta } from '@/shared/cache/revalidar-ruta'
import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import type { EstadoDeAccion } from '@/shared/forms/estado-de-accion'
import { borrarTipoDeFallo } from '@/shared/observability/lectura'
import { registrarFallo } from '@/shared/observability/fallos'
import { tr } from '@/shared/i18n/idioma-servidor'
import { esSaltoDeNext } from '@/shared/design/ui/sin-caerse'

/**
 * «Ya está arreglado»: borra ese tipo de fallo del registro. Queda en la auditoría.
 *
 * Devuelve lo que pasó: antes una huella que no cuadraba salía por un `return` mudo y el botón
 * parecía roto —se pulsaba y la fila seguía ahí, sin una palabra.
 */
export async function borrarTipoDeFalloAction(_previo: EstadoDeAccion, formData: FormData): Promise<EstadoDeAccion> {
  const t = await tr()
  const actor = await requireAdmin()
  const huella = String(formData.get('huella') ?? '')
  if (!/^[0-9a-f]{16}$/.test(huella)) {
    return { status: 'error', message: t('No pudimos identificar ese fallo. Recarga la página.', 'We couldn’t identify that error. Reload the page.') }
  }
  // **El `try` solo abraza el borrado.** Si lo que falla es la auditoría, el borrado ya ocurrió:
  // decir «no pudimos borrarlo» mandaría al admin a pulsar otra vez sobre una fila que ya no está.
  let n = 0
  try {
    n = await borrarTipoDeFallo(huella)
  } catch (causa) {
    // Un `redirect()` de Next viaja como excepción: tragárselo dejaría al admin con un aviso
    // de borrado donde tenía que haber una pantalla de sesión caducada.
    if (esSaltoDeNext(causa)) throw causa
    // El `Error` entero, no su texto: es lo que lleva la pila al registro.
    registrarFallo('admin/fallos-actions', 'No se pudo borrar el tipo de fallo', causa)
    return { status: 'error', message: t('No pudimos borrarlo. Vuelve a intentarlo.', 'We couldn’t clear it. Try again.') }
  }

  revalidarRuta('/dashboard/admin/errors')
  // La auditoría no decide lo que se le dice al admin: el borrado ya está hecho.
  await admin.record(actor, { action: 'fallos.borrados', subject: huella, detail: `${n} registros` }).catch((causa: unknown) => {
    registrarFallo('admin/fallos-actions', 'No se pudo anotar el borrado en la auditoría', causa)
  })
  return n === 0
    ? { status: 'success', message: t('Ese fallo ya no estaba en el registro.', 'That error was no longer in the log.') }
    : { status: 'success', message: t(`Borrado del registro: ${String(n)} apunte(s).`, `Cleared from the log: ${String(n)} entr(ies).`) }
}
