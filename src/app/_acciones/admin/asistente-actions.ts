'use server'

import { revalidatePath } from 'next/cache'
import { admin, asistente } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { validarConfig } from '@/modules/asistente'
import { campo } from '@/shared/forms/campo'
import { registrarFallo } from '@/shared/observability/fallos'
import { tr } from '@/shared/i18n/idioma-servidor'

export type AsistenteState = { status: 'idle' } | { status: 'success'; message: string } | { status: 'error'; message: string }

/** Admin › Asistente: qué planes traen a Luxury, cuántos mensajes por evento y mes, y el techo del mes. */
export async function guardarAsistenteAction(_previo: AsistenteState, formData: FormData): Promise<AsistenteState> {
  const t = await tr()
  const actor = await requireAdmin()
  const config = validarConfig({
    planes: formData.getAll('plan').map(String),
    mensajesPorMes: Number(campo(formData, 'mensajes')),
    presupuestoUsd: Number(campo(formData, 'presupuesto').replace(',', '.')),
    atajoDeSiri: campo(formData, 'atajoDeSiri').trim(),
  })
  if (config === null) return { status: 'error', message: t('Revisa los números (mensajes entero de 0 a 100.000, gasto de 0 a 10.000 USD) y que el atajo sea un enlace https://www.icloud.com/shortcuts/…', 'Check the numbers (messages a whole number from 0 to 100,000, spend from 0 to 10,000 USD) and that the shortcut is an https://www.icloud.com/shortcuts/… link') }
  try {
    await asistente.guardarConfig(config)
  } catch (causa) {
    registrarFallo('admin/asistente-actions', 'no se pudo guardar la configuración del asistente:', causa)
    return { status: 'error', message: t('No pudimos guardar. Vuelve a intentarlo en un momento.', 'We couldn’t save. Try again in a moment.') }
  }
  await admin.record(actor, { action: 'asistente.ajustes', subject: 'asistente', detail: `${config.planes.join(', ') || 'ningún plan'} · ${config.mensajesPorMes} mensajes · ${config.presupuestoUsd} USD` })
  revalidatePath('/panel/admin/asistente')
  return { status: 'success', message: t('Guardado.', 'Saved.') }
}
