'use server'

import { revalidatePath } from 'next/cache'
import { admin, asistente } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { validarConfig } from '@/modules/asistente'
import { campo } from '@/shared/forms/campo'

export type AsistenteState = { status: 'idle' } | { status: 'success'; message: string } | { status: 'error'; message: string }

/** Admin › Asistente: qué planes traen a Luxury, cuántos mensajes por evento y mes, y el techo del mes. */
export async function guardarAsistenteAction(_previo: AsistenteState, formData: FormData): Promise<AsistenteState> {
  const actor = await requireAdmin()
  const config = validarConfig({
    planes: formData.getAll('plan').map(String),
    mensajesPorMes: Number(campo(formData, 'mensajes')),
    presupuestoUsd: Number(campo(formData, 'presupuesto').replace(',', '.')),
  })
  if (config === null) return { status: 'error', message: 'Revisa los números: mensajes entero de 0 a 100.000 y gasto de 0 a 10.000 USD.' }
  try {
    await asistente.guardarConfig(config)
  } catch (causa) {
    console.error('guardarAsistenteAction', causa)
    return { status: 'error', message: 'No pudimos guardar. Vuelve a intentarlo en un momento.' }
  }
  await admin.record(actor, { action: 'asistente.ajustes', subject: 'asistente', detail: `${config.planes.join(', ') || 'ningún plan'} · ${config.mensajesPorMes} mensajes · ${config.presupuestoUsd} USD` })
  revalidatePath('/panel/admin/asistente')
  return { status: 'success', message: 'Guardado.' }
}
