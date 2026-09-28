'use server'

import { revalidatePath } from 'next/cache'
import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { MENSAJES } from '@/modules/admin/domain/mensajes'
import { campo } from '@/shared/forms/campo'
import { isErr } from '@/shared/result'

export type MensajesState = { status: 'idle' } | { status: 'success'; message: string } | { status: 'error'; message: string }

/** Las plantillas de los mensajes al cliente, la capacidad de la agenda y el descuento de recomendación. */
export async function guardarMensajesAction(_previo: MensajesState, formData: FormData): Promise<MensajesState> {
  const actor = await requireAdmin()
  const guardado = await admin.saveMensajes(actor, {
    mensajes: Object.fromEntries(MENSAJES.map((m) => [m.clave, campo(formData, m.clave)])),
    capacidad: Number(campo(formData, 'capacidad')),
    descuentoReferido: Number(campo(formData, 'descuento')),
  })
  if (isErr(guardado)) {
    console.error('guardarMensajesAction', guardado.error.detail)
    return { status: 'error', message: 'No pudimos guardar. Vuelve a intentarlo en un momento.' }
  }
  for (const ruta of ['/panel/admin/mensajes', '/panel/admin/ventas', '/panel/admin/eventos/calendario']) revalidatePath(ruta)
  return { status: 'success', message: 'Guardado.' }
}
