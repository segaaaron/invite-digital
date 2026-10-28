'use server'

import { revalidarRuta } from '@/shared/cache/revalidar-ruta'
import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { MENSAJES } from '@/modules/admin/domain/mensajes'
import { campo } from '@/shared/forms/campo'
import { isErr } from '@/shared/result'
import { registrarFallo } from '@/shared/observability/fallos'
import { tr } from '@/shared/i18n/idioma-servidor'

export type MensajesState = { status: 'idle' } | { status: 'success'; message: string } | { status: 'error'; message: string }

/** Las plantillas de los mensajes al cliente, la capacidad de la agenda y el descuento de recomendación. */
export async function guardarMensajesAction(_previo: MensajesState, formData: FormData): Promise<MensajesState> {
  const t = await tr()
  const actor = await requireAdmin()
  const guardado = await admin.saveMensajes(actor, {
    mensajes: Object.fromEntries(MENSAJES.map((m) => [m.clave, campo(formData, m.clave)])),
    capacidad: Number(campo(formData, 'capacidad')),
    descuentoReferido: Number(campo(formData, 'descuento')),
  })
  if (isErr(guardado)) {
    registrarFallo('admin/mensajes-actions', 'guardarMensajesAction', guardado.error.detail)
    return { status: 'error', message: t('No pudimos guardar. Vuelve a intentarlo en un momento.', 'We couldn’t save. Try again in a moment.') }
  }
  for (const ruta of ['/dashboard/admin/messages', '/dashboard/admin/sales', '/dashboard/admin/events/calendar']) revalidarRuta(ruta)
  return { status: 'success', message: t('Guardado.', 'Saved.') }
}
